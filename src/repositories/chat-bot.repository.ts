import mongoose from "mongoose";
import { ChatbotModel } from "../models/chatbot.model";
import { TCreateChatBot } from "../types";

export class ChatbotRepository {
  async createChatbot(data: TCreateChatBot) {
    return await ChatbotModel.create(data);
  }

  async findAllByUserId(userId: string): Promise<any[] | null> {
    return await ChatbotModel.aggregate([
      {
        $match: { userId: new mongoose.Types.ObjectId(userId) },
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
    accountId: string
  ): Promise<any[] | null> {
    return await ChatbotModel.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
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

  async findChatbotById(
    userId: string,
    accountId: string,
    chatbotId: string
  ): Promise<any | null> {
    return await ChatbotModel.findOne({ userId, accountId, _id: chatbotId });
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
    data: any
  ) {
    return await ChatbotModel.findOneAndUpdate(
      { userId, accountId, _id: chatbotId },
      data,
      { new: true }
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
    chatbotId: string
  ): Promise<{} | null> {
    return await ChatbotModel.findOneAndDelete({
      userId,
      accountId,
      _id: chatbotId,
    });
  }
}
