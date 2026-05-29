// services/conversation.service.ts

import mongoose, { FilterQuery } from "mongoose";
import { emitToOrganization } from "../config/wsServer/wsEmitter";
import { InitConversationDto } from "../dtos/conversation.dot";
import { AccountRepository } from "../repositories/account.repository";
import { ConversationRepository } from "../repositories/conversations.repository";
import { NotificationRepository } from "../repositories/notification.repository";
import { buildPagination } from "../utils/paginationBuilder";
import { TConversationQuery, TQueryParams } from "../types/api-response.type";
import { TConversation } from "../types/conversation.type";
import { MessageRepository } from "../repositories/messages.repository";
import { buildSearchPreview } from "../utils/buildSearchPreview";

export class ConversationService {
  private repository: ConversationRepository;
  private accountRepository: AccountRepository;
  private notificationRepository: NotificationRepository;
  private messageRepository: MessageRepository;

  constructor() {
    this.repository = new ConversationRepository();
    this.accountRepository = new AccountRepository();
    this.notificationRepository = new NotificationRepository();
    this.messageRepository = new MessageRepository();
  }

  async initConversation(payload: InitConversationDto) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const existingConversation =
        await this.repository.findConversationByVisitor({
          visitorId: payload.visitorId,
          platform: payload.platform,
        });

      // RETURN EXISTING
      if (existingConversation) {
        return existingConversation;
      }

      // CREATE NEW
      const createConversationPayload = {
        accountId: payload.accountId,
        visitorId: payload.visitorId,
        platform: payload.platform,
        identifiers: payload.identifiers,
      };

      const conversation = await this.repository.createConversation(
        createConversationPayload,
        session,
      );

      if (conversation) {
        const account = await this.accountRepository.findOne(payload.accountId);

        if (!account) return null;

        const notificationPayload = {
          organizationId: account.organizationId,
          title: `Customer initiated a new chat on ${payload.platform}`,
          description: "",
          accountId: payload.accountId,
          typeId: String(conversation?.id) || "",
          type: "message" as const,
          channelType: payload.platform as
            | "chatbot"
            | "instagram"
            | "facebook"
            | "whatsapp",
          meta: payload,
        };

        const notification =
          await this.notificationRepository.findByTypeIdAndUpdate(
            notificationPayload,
            session,
          );

        emitToOrganization({
          organizationId: account.organizationId,
          accountId: payload.accountId,
          event: "NEW_NOTIFICATION",
          data: {
            notification,
          },
        });

        await session.commitTransaction();
      }
      return conversation;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    }
  }

  async getConversationsByAccountId(
    accountId: string,
    query: TConversationQuery,
  ) {
    const { page = 1, limit = 50, search, filters } = query;
    const status = filters?.status;
    const platform = filters?.platform;

    const filter: FilterQuery<TConversation> = {
      accountId,
      isDeleted: false,
      ...(platform && { platform }),
    };

    // 🔍 filters
    if (status) filter.status = status;
    if (platform) filter.platform = platform;

    let matchedMessageMap = new Map();

    if (search) {
      const matchedMessages =
        await this.messageRepository.searchConversationIdsByMessageText(search);

      const conversationIds = [
        ...new Set(matchedMessages.map((msg) => msg.conversationId.toString())),
      ];

      console.log("matchedMessages", matchedMessages);

      // store first matched message preview

      matchedMessages.forEach((msg) => {
        const conversationId = msg.conversationId.toString();

        if (!matchedMessageMap.has(conversationId)) {
          matchedMessageMap.set(conversationId, {
            text: msg?.searchText,
            messageId: msg.messageId.toString(),
          });
        }
      });

      filter.$or = [
        {
          visitorId: {
            $regex: search,
            $options: "i",
          },
        },

        {
          "lastMessage.text": {
            $regex: search,
            $options: "i",
          },
        },

        {
          _id: {
            $in: conversationIds,
          },
        },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const docs = await this.repository.getConversationByAccountId({
      filter,
      skip,
      limit: Number(limit),
    });

    const formattedDocs = docs.map((conversation) => {
      const matchedMessage = matchedMessageMap.get(conversation._id.toString());
      return {
        ...conversation.toJSON(),
        searchPreview: matchedMessage?.text
          ? buildSearchPreview({
              text: matchedMessage.text,
              search: String(search),
            })
          : null,
        matchedMessageId: matchedMessage?.messageId || null,
      };
    });

    const totalDocs = await this.repository.countConversations(filter);

    return {
      docs: formattedDocs,
      meta: buildPagination({ page, limit, totalDocs, docsCount: docs.length }),
    };
  }

  async getConversationById(conversationId: string) {
    return this.repository.getConversationById(conversationId);
  }

  async getConversationByVisitor(visitorId: string) {
    return this.repository.getConversationByVisitor(visitorId);
  }
}
