import mongoose from "mongoose";
import { ChatFlow } from "../models/chatflow.model.js";
import { TChatFlow } from "../types/chatflow.type.js";
import { TQueryParams } from "../types/api-response.type.js";

export class ChatFlowRepository {
  async countDocument(accountId: string): Promise<number> {
    return await ChatFlow.countDocuments({
      accountId: new mongoose.Types.ObjectId(accountId),
    });
  }
  async createChatFlow(data: Partial<TChatFlow>): Promise<TChatFlow | null> {
    const chatflow = await ChatFlow.create([data]);
    return chatflow[0].toJSON();
  }
  // async findChatFlowByAccountId(
  //   accountId: string,
  //   options: TQueryParams = {},
  // ): Promise<TChatFlow[]> {
  //   const { page, limit, filters, search } = options;
  //   const skip = (Number(page) - 1) * Number(limit);

  //   const query: any = {
  //     accountId: new mongoose.Types.ObjectId(accountId),
  //   };

  //   // search
  //   if (search) {
  //     query.$or = [
  //       {
  //         name: {
  //           $regex: search,
  //           $options: "i",
  //         },
  //       },

  //       {
  //         description: {
  //           $regex: search,
  //           $options: "i",
  //         },
  //       },
  //     ];
  //   }

  //   // filters
  //   if (filters && typeof filters === "object") {
  //     Object.assign(query, filters);
  //   }

  //   return await ChatFlow.find(query);
  // }
  async findChatFlowByAccountId(
    accountId: string,
    options: TQueryParams = {},
  ): Promise<TChatFlow[]> {
    const { page, limit, filters, search } = options;
    const skip = (Number(page) - 1) * Number(limit);

    return await ChatFlow.find({
      accountId: new mongoose.Types.ObjectId(accountId),
    });
  }
  async findChatFlowById(
    accountId: string,
    chatflowId: string,
  ): Promise<TChatFlow | null> {
    return await ChatFlow.findOne({
      accountId: new mongoose.Types.ObjectId(accountId),
      _id: new mongoose.Types.ObjectId(chatflowId),
    });
  }
  async updateChatFlow(
    chatFlowId: string,
    data: Partial<TChatFlow>,
  ): Promise<TChatFlow | null> {
    return await ChatFlow.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(chatFlowId),
      },
      {
        ...data,
        $inc: {
          version: 0.1,
        },
      },
      { new: true },
    );
  }
  async deleteChatFlow(chatflowId: string): Promise<TChatFlow | null> {
    return await ChatFlow.findByIdAndDelete(chatflowId);
  }
}
