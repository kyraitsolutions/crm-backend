import mongoose from "mongoose";
import { ChatbotFlowModel, ChatbotModel } from "../models/chatbot.model.js";
import { TCreateChatBot } from "../types/chat-bot.type.js";

export class ChatbotRepository {
  async createChatbot(data: TCreateChatBot) {
    return await ChatbotModel.create(data);
  }

  async findChatbotFlowById(accountId: string, chatBotId: string) {
    return await ChatbotFlowModel.findOne({
      accountId: new mongoose.Types.ObjectId(accountId),
      chatbotId: new mongoose.Types.ObjectId(chatBotId),
    });
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

  async findAllByAccountId(accountId: string): Promise<any[] | null> {
    return await ChatbotModel.aggregate([
      {
        $match: {
          // userId: new mongoose.Types.ObjectId(userId),
          accountId: new mongoose.Types.ObjectId(accountId),
        },
      },
      {
        $project: {
          id: "$_id",
          name: 1,
          description: 1,
          status: 1,
          flowId: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);
  }

  async findChatbotWithFlow(accountId: string, chatbotId: string) {
    console.log("aaya hai bhai ke baat hogaye");
    const chatbotWithFlow = await ChatbotModel.aggregate([
      {
        $match: {
          accountId: new mongoose.Types.ObjectId(accountId),
          _id: new mongoose.Types.ObjectId(chatbotId),
        },
      },
      {
        $lookup: {
          from: "chatflows",
          let: {
            flowId: "$flowId",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$_id", "$$flowId"],
                },
                status: "published",
              },
            },

            {
              $project: {
                nodes: 1,
                edges: 1,
              },
            },
          ],
          as: "flow",
        },
      },
      {
        $unwind: {
          path: "$flow",
          preserveNullAndEmptyArrays: true,
        },
      },
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

    console.log("chatbotWithFlow", chatbotWithFlow);

    return chatbotWithFlow[0];
  }

  async findChatbotById(
    accountId: string,
    chatbotId: string,
  ): Promise<any | null> {
    return await ChatbotModel.findOne({ accountId, _id: chatbotId });
  }

  async updateChatbot(accountId: string, chatbotId: string, data: any) {
    return await ChatbotModel.findOneAndUpdate(
      { accountId, _id: chatbotId },
      data,
      { new: true },
    );
  }

  async deleteChatbotById(
    accountId: string,
    chatbotId: string,
  ): Promise<{} | null> {
    return await ChatbotModel.findOneAndDelete({
      accountId,
      _id: chatbotId,
    });
  }
}
