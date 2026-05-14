// services/conversation.service.ts

import { ConversationRepository } from "../repositories/conversations.repository";
import { buildPagination } from "../utils/paginationBuilder";
import { InitConversationDto } from "../dtos/conversation.dot";
import { AccountRepository } from "../repositories/account.repository";
import { NotificationRepository } from "../repositories/notification.repository";
import mongoose from "mongoose";
import {
  emitToAccount,
  emitToOrganization,
} from "../config/wsServer/wsEmitter";

export class ConversationService {
  private repository: ConversationRepository;
  private accountRepository: AccountRepository;
  private notificationRepository: NotificationRepository;

  constructor() {
    this.repository = new ConversationRepository();
    this.accountRepository = new AccountRepository();
    this.notificationRepository = new NotificationRepository();
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

  async getConversationsByAccountId(accountId: string, query: any) {
    const { page = 1, limit = 50, search, status, platform } = query;

    const filter: any = {
      accountId,
      isDeleted: false,
      ...(query?.platform && { platform }),
    };

    // 🔍 filters
    if (status) filter.status = status;
    if (platform) filter.platform = platform;

    if (search) {
      filter.$or = [
        { visitorId: { $regex: search, $options: "i" } },
        { "lastMessage.text": { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const docs = await this.repository.getConversationByAccountId({
      filter,
      skip,
      limit: Number(limit),
    });

    const totalDocs = await this.repository.countConversations(filter);

    return {
      docs,
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
