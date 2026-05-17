import mongoose from "mongoose";
import { ChatFlow } from "../models/chatflow.model.js";
import { TChatFlow } from "../types/chatflow.type.js";

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
  async findChatFlowByAccountId(accountId: string): Promise<TChatFlow[]> {
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
