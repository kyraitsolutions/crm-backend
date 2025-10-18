import mongoose from "mongoose";
import {
  ChatbotModel,
  ChatbotKnowledgeSourceModel,
  ChatbotKnowledgeChunkModel,
  ChatbotSuggestedQuestionModel,
  ChatbotConversationSettingModel,
} from "../models/chatbot.model";

export class ChatbotRepository {
  async createChatbot(data: any) {
    return await ChatbotModel.create(data);
  }

  async findAllByUserId(userId:string):Promise<any[] | null>{
    return await ChatbotModel.aggregate([
      {
        $match: { userId: new mongoose.Types.ObjectId(userId) }
      },
      {
        $lookup: {
          from: "chatbotconversationsettings",
          localField: "_id",
          foreignField: "chatbotId",
          as: "conversationSettings"
        }
      },
      // {
      //   $lookup: {
      //     from: "chatbotknowledgechunks",
      //     localField: "_id",
      //     foreignField: "chatbotId",
      //     as: "knowledgeChunks"
      //   }
      // },
      {
        $lookup: {
          from: "chatbotknowledgesources",
          localField: "_id",
          foreignField: "chatbotId",
          as: "knowledgeSources"
        }
      },
      {
        $lookup: {
          from: "chatbotsuggestedquestions",
          localField: "_id",
          foreignField: "chatbotId",
          as: "suggestedQuestions"
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          userId: 1,
          createdAt: 1,
          updatedAt: 1,
          conversationSettings: 1,
          // knowledgeChunks: 1,
          knowledgeSources: 1,
          suggestedQuestions: 1
        }
      }
    ]);
  }

  async findAllByAccountId(userId:string):Promise<any[]|null>{
    
  }
  async addKnowledgeSource(data: any) {
    return await ChatbotKnowledgeSourceModel.create(data);
  }

  async addKnowledgeChunks(data: any[]) {
    if (!data.length) return [];
    return await ChatbotKnowledgeChunkModel.insertMany(data);
  }

  async addSuggestedQuestions(data: any[]) {
    if (!data.length) return [];
    return await ChatbotSuggestedQuestionModel.insertMany(data);
  }

  async addConversationSettings(data: any) {
    return await ChatbotConversationSettingModel.create(data);
  }

  // async addTheme(data: any) {
  //   return await ChatbotThemeModel.create(data);
  // }

  async updateChatbot(chatbotId: string, data: any) {
    return await ChatbotModel.findByIdAndUpdate(chatbotId, data, { new: true });
  }

  async updateKnowledgeSource(chatbotId: string, data: any) {
    return await ChatbotKnowledgeSourceModel.findOneAndUpdate({ chatbotId }, data, {
      new: true,
    });
  }

  async updateConversationSettings(chatbotId: string, data: any) {
    return await ChatbotConversationSettingModel.findOneAndUpdate(
      { chatbotId },
      data,
      { new: true }
    );
  }

//   async updateTheme(chatbotId: string, data: any) {
//     return await ChatbotThemeModel.findOneAndUpdate({ chatbotId }, data, {
//       new: true,
//     });
//   }

//   async deleteKnowledgeChunks(chatbotId: string, sourceId: string) {
//     return await ChatbotKnowledgeChunkModel.deleteMany({ chatbotId, sourceId });
//   }

//   async deleteSuggestedQuestions(chatbotId: string) {
//     return await ChatbotSuggestedQuestionModel.deleteMany({ chatbotId });
//   }
}
