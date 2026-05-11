// repositories/conversation.repository.ts

import { ClientSession } from "mongoose";
import { ConversationModel } from "../models/conversations.model";
import { TConversation } from "../types/conversation.type";

type CreateConversationPayload = {
  accountId: string;
  visitorId: string;
  chatbotId?: string | null;
  platform:
    | "chatbot"
    | "whatsapp"
    | "instagram"
    | "messenger"
    | "telegram"
    | "email";
};

export class ConversationRepository {
  async countConversations(filter: any) {
    return ConversationModel.countDocuments(filter);
  }

  async createConversation(data: Partial<TConversation>) {
    return ConversationModel.create(data);
  }

  async findConversationByVisitor({
    visitorId,
    platform,
  }: {
    visitorId: string;
    platform: string;
  }) {
    return ConversationModel.findOne({
      visitorId,
      platform,
      isDeleted: false,
    });
  }

  async getConversationById(conversationId: string) {
    return ConversationModel.findById(conversationId);
  }

  async getConversationByAccountId({ filter, skip, limit }: any) {
    return await ConversationModel.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);
  }

  async getConversationByVisitor(visitorId: string) {
    return ConversationModel.find({
      visitorId,
      isDeleted: false,
    }).sort({
      updatedAt: -1,
    });
  }

  async updateConversation(
    conversationId: string,
    payload: any,
    session: ClientSession,
  ) {
    let lastMessageText = "";
    switch (payload?.type) {
      case "text":
        lastMessageText = payload?.body?.text || "";
        break;

      case "interactive":
        lastMessageText =
          payload?.interactive?.body?.text || "Interactive Message";
        break;

      case "image":
        lastMessageText = "📷 Image";
        break;

      case "video":
        lastMessageText = "🎥 Video";
        break;

      case "document":
        lastMessageText = "📄 Document";
        break;

      case "question":
        lastMessageText = payload?.question?.text || "Question";
        break;

      default:
        lastMessageText = payload?.type || "Message";
    }

    const unreadIncrement = payload.direction === "inbound" ? 1 : 0;

    return await ConversationModel.findByIdAndUpdate(
      conversationId,
      {
        $set: {
          "lastMessage.messageId": payload.messageId,
          "lastMessage.text": lastMessageText,
          "lastMessage.type": payload.type || "",
          "lastMessage.from": payload.from || "",
          "lastMessage.updatedAt": new Date(),
        },

        $inc: {
          totalMessages: 1,
          unreadCount: unreadIncrement,
        },
      },
      {
        new: true,
        session,
      },
    );
  }
}
