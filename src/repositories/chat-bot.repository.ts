import mongoose from "mongoose";
import { ChatbotModel, ChatbotFlowModel } from "../models/chatbot.model.js";
import { TCreateChatBot, TCreateChatBotFlow } from "../types/chat-bot.type.js";
import { ROLE_PERMISSIONS } from "../rbac/role-permissions.js";
import { hasPermission } from "../rbac/hasPermission.js";
import { USERROLE } from "../enums/user.enum.js";

export class ChatbotRepository {
  async createChatbot(data: TCreateChatBot) {
    return await ChatbotModel.create(data);
  }

  async createChatbotFlow(data: TCreateChatBotFlow) {
    return await ChatbotFlowModel.create(data);
  }

  async findChatbotFlowById(accountId: string, chatBotId: string) {
    return await ChatbotFlowModel.findOne({
      accountId: new mongoose.Types.ObjectId(accountId),
      chatbotId: new mongoose.Types.ObjectId(chatBotId),
    });
  }

  async updateChatbotFlow(
    accountId: string,
    chatBotId: string,
    data: TCreateChatBotFlow,
  ) {
    return await ChatbotFlowModel.findOneAndUpdate(
      {
        accountId: new mongoose.Types.ObjectId(accountId),
        chatbotId: new mongoose.Types.ObjectId(chatBotId),
      },
      data,
      { new: true },
    );
  }

  async findAllByUserId(userId: string): Promise<any[] | null> {
    return await ChatbotModel.aggregate([
      {
        $match: { userId: new mongoose.Types.ObjectId(userId) },
      },
      {
        $sort: {
          createdAt: -1, // ✅ latest first
        },
      },
      {
        $lookup: {
          from: "chatbotconversationsettings",
          localField: "_id",
          foreignField: "chatbotId",
          as: "conversationSettings",
        },
      },

      {
        $project: {
          _id: 1,
          name: 1,
          userId: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);
  }

  async findAllByAccountId(
    userId: string,
    accountId: string,
  ): Promise<any[] | null> {
    return await ChatbotModel.aggregate([
      {
        $match: {
          // userId: new mongoose.Types.ObjectId(userId),
          accountId: new mongoose.Types.ObjectId(accountId),
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          description: 1,
          status: 1,
          // accountId: 1,
          createdAt: 1,
          // updatedAt: 1,
        },
      },
    ]);
  }

  async findChatbotWithFlow(accountId: string, chatbotId: string) {
    const chatbotWithFlow = await ChatbotModel.aggregate([
      {
        $match: {
          accountId: new mongoose.Types.ObjectId(accountId),
          _id: new mongoose.Types.ObjectId(chatbotId),
        },
      },
      {
        $lookup: {
          from: "chatbotflows",
          localField: "_id",
          foreignField: "chatbotId",
          as: "flow",
        },
      },
      { $unwind: "$flow" },
      {
        $project: {
          name: 1,
          description: 1,
          userId: 1,
          accountId: 1,
          status: 1,
          config: 1,
          theme: 1,
          conversation: 1,
          createdAt: 1,
          updatedAt: 1,
          flow: {
            nodes: "$flow.nodes",
            edges: "$flow.edges",
          },
        },
      },
    ]);
    return chatbotWithFlow[0];
  }

  async findChatbotById(
    userId: string,
    accountId: string,
    chatbotId: string,
  ): Promise<any | null> {
    return await ChatbotModel.findOne({ accountId, _id: chatbotId });
  }
  // async addKnowledgeSource(data: any) {
  //   return await ChatbotKnowledgeSourceModel.create(data);
  // }

  // async addKnowledgeChunks(data: any[]) {
  //   if (!data.length) return [];
  //   return await ChatbotKnowledgeChunkModel.insertMany(data);
  // }

  // async addSuggestedQuestions(data: any[]) {
  //   if (!data.length) return [];
  //   return await ChatbotSuggestedQuestionModel.insertMany(data);
  // }

  // async addConversationSettings(data: any) {
  //   return await ChatbotConversationSettingModel.create(data);
  // }

  // async addTheme(data: any) {
  //   return await ChatbotThemeModel.create(data);
  // }

  async updateChatbot(
    userId: string,
    accountId: string,
    chatbotId: string,
    data: any,
  ) {
    return await ChatbotModel.findOneAndUpdate(
      { accountId, _id: chatbotId },
      data,
      { new: true },
    );
  }

  // async updateKnowledgeSource(chatbotId: string, data: any) {
  //   return await ChatbotKnowledgeSourceModel.findOneAndUpdate({ chatbotId }, data, {
  //     new: true,
  //   });
  // }

  // async updateConversationSettings(chatbotId: string, data: any) {
  //   return await ChatbotConversationSettingModel.findOneAndUpdate(
  //     { chatbotId },
  //     data,
  //     { new: true }
  //   );
  // }

  //   async updateTheme(chatbotId: string, data: any) {
  //     return await ChatbotThemeModel.findOneAndUpdate({ chatbotId }, data, {
  //       new: true,
  //     });
  //   }

  //   async deleteKnowledgeChunks(chatbotId: string, sourceId: string) {
  //     return await ChatbotKnowledgeChunkModel.deleteMany({ chatbotId, sourceId });
  //   }

  async deleteChatbotById(
    userId: string,
    accountId: string,
    chatbotId: string,
    roleId: string,
  ): Promise<{} | null> {
    const role = roleId.toString() as USERROLE;
    const permissions = ROLE_PERMISSIONS[role];

    const isPermissionAllow = hasPermission(permissions, "chatbot:delete");

    if (!isPermissionAllow)
      throw new Error("You don't have permission to delete");

    return await ChatbotModel.findOneAndDelete({
      accountId,
      _id: chatbotId,
    });
  }
}
