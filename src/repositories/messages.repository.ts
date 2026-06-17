import { ClientSession } from "mongoose";
import { MessageModel } from "../models/messages.model";
import { TMessage } from "../types/message.type";

export class MessageRepository {
  public async getMessagesByConversationId(
    conversationId: string,
  ): Promise<TMessage[]> {
    return MessageModel.find({ conversationId });
  }
  public async createMessage(
    payload: Partial<TMessage>,
    session?: ClientSession,
  ) {
    const message = await MessageModel.create([payload], { session });
    return message[0].toJSON();
  }
  public async createMany(payload: any[]) {
    if (!payload?.length) {
      return [];
    }
    return MessageModel.insertMany(payload);
  }
  public async searchConversationIdsByMessageText(search: string) {
    const messages = await MessageModel.find({
      searchText: {
        $regex: search,
        $options: "i",
      },
    })
      .select("_id conversationId searchText messageId")
      .lean();

    return messages;
  }
}
