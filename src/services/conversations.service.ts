// services/conversation.service.ts

import mongoose, { FilterQuery } from "mongoose";
import { InitConversationDto } from "../dtos/conversation.dot.js";
import { AccountRepository } from "../repositories/account.repository.js";
import { ConversationRepository } from "../repositories/conversations.repository.js";
import { buildPagination } from "../utils/paginationBuilder.js";
import {
  TConversationQuery,
} from "../types/api-response.type.js";
import { TConversation } from "../types/conversation.type.js";
import { MessageRepository } from "../repositories/messages.repository.js";
import { buildSearchPreview } from "../utils/buildSearchPreview.js";
import { notificationService, configBootstrapService } from "../container.js";
import { HttpError } from "../utils/http.error.js";
import { ConversationModel } from "../models/conversations.model.js";

export class ConversationService {
  private repository: ConversationRepository;
  private accountRepository: AccountRepository;
  private messageRepository: MessageRepository;

  constructor() {
    this.repository = new ConversationRepository();
    this.accountRepository = new AccountRepository();
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
          organizationId: String(account.organizationId),
          accountId: payload.accountId,
          conversationId: String(conversation?.id || ""),
          platform: payload.platform,
          isNew: true,
        };

        await notificationService.notifyConversation(notificationPayload);

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
        ...new Set(
          matchedMessages.map((msg: any) => msg.conversationId.toString()),
        ),
      ];

      // store first matched message preview

      matchedMessages.forEach((msg: any) => {
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
          "contact.name": {
            $regex: search,
            $options: "i",
          },
        },
        {
          "contact.phoneNumber": {
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

    const formattedDocs = docs.map((conversation: any) => {
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

  async getOrCreateConversation({
    filter,
    create,
  }: {
    filter: any;
    create: Partial<TConversation>;
  }) {
    let conversation = await this.repository.findOne(filter);

    if (conversation) {
      const nextName = String((create as any)?.contact?.name || "").trim();
      if (nextName && !String((conversation as any)?.contact?.name || "").trim()) {
        const updated = await ConversationModel.findByIdAndUpdate(
          conversation._id,
          { $set: { "contact.name": nextName } },
          { new: true },
        );
        if (updated) conversation = updated;
      }
      return conversation;
    }

    conversation = await this.repository.createConversation(create);
    const accountId = String(create.accountId || filter.accountId || "");
    if (accountId && conversation) {
      const account = await this.accountRepository.findOne(accountId);
      if (account?.organizationId) {
        await notificationService.notifyConversation({
          organizationId: String(account.organizationId),
          accountId,
          conversationId: String((conversation as any).id || (conversation as any)._id),
          platform: String(create.platform || filter.platform || "whatsapp"),
          isNew: true,
          phone: (create as any)?.contact?.phoneNumber || filter?.["contact.phoneNumber"],
          contactName: (create as any)?.contact?.name,
        });
      }
    }

    return conversation;
  }

  async deleteConversations(
    accountId: string,
    conversationIds: string[],
    options: { deleteContact?: boolean; userId: string },
  ) {
    const { recyclebinService } = await import("../container.js");
    return recyclebinService.moveConversationsToBin({
      accountId,
      userId: options.userId,
      conversationIds,
      deleteContact: Boolean(options.deleteContact),
    });
  }

  async updateConversationProfile(
    accountId: string,
    conversationId: string,
    payload: {
      status?: string;
      tags?: { label: string; color?: string }[];
      followUps?: {
        note?: string;
        dueAt?: string | Date | null;
        completedAt?: string | Date | null;
        createdAt?: string | Date | null;
      }[];
    },
    organizationId?: string,
  ) {
    const conversation = await this.repository.findOne({
      _id: conversationId,
      accountId,
      isDeleted: false,
    });
    if (!conversation) {
      throw HttpError.notFound("Conversation not found");
    }

    const $set: Record<string, unknown> = {};
    if (payload.status) {
      const key = String(payload.status).trim().toLowerCase();
      if (organizationId) {
        const configs = await configBootstrapService.getConfigurations({
          organizationId,
          module: "conversation",
          configType: "status",
        });
        const list = (configs as any)?.doc;
        const values = Array.isArray(list) ? list[0]?.values : list?.values;
        const allowed = (values || []).map((item: any) => String(item.key).toLowerCase());
        if (allowed.length && !allowed.includes(key)) {
          throw HttpError.badRequest("Select a configured conversation status");
        }
      }
      $set.status = key;
    }

    if (payload.tags) {
      $set.tags = payload.tags
        .map((tag) => ({
          label: String(tag.label || "").trim(),
          color: String(tag.color || "#84cc16"),
        }))
        .filter((tag) => tag.label);
    }

    if (payload.followUps) {
      $set.followUps = payload.followUps
        .map((item) => ({
          note: String(item.note || "").trim(),
          dueAt: item.dueAt ? new Date(item.dueAt) : null,
          completedAt: item.completedAt ? new Date(item.completedAt) : null,
          createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
        }))
        .filter((item) => item.note || item.dueAt);
    }

    if (!Object.keys($set).length) {
      return conversation;
    }

    return ConversationModel.findOneAndUpdate(
      { _id: conversationId, accountId, isDeleted: false },
      { $set },
      { new: true },
    );
  }
}

export const conversationService = new ConversationService();
