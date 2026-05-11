// services/conversation.service.ts

import { Types } from "mongoose";
import { ConversationRepository } from "../repositories/conversations.repository";
import { buildPagination } from "../utils/paginationBuilder";
import { InitConversationDto } from "../dtos/conversation.dot";

export class ConversationService {
  private repository: ConversationRepository;

  constructor() {
    this.repository = new ConversationRepository();
  }

  async initConversation(payload: InitConversationDto) {
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

    return this.repository.createConversation(createConversationPayload);
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
