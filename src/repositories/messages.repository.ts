import { ClientSession } from "mongoose";
import { MessageModel } from "../models/messages.model";

export class MessageRepository {
  public async createMessage(payload: any, session?: ClientSession) {
    return MessageModel.create([payload], { session });
  }

  public async createMany(payload: any[]) {
    if (!payload?.length) {
      return [];
    }

    return MessageModel.insertMany(payload);
  }
}
