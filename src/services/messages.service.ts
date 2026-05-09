import mongoose from "mongoose";
import { ConversationRepository } from "../repositories/conversations.repository";
import { MessageRepository } from "../repositories/messages.repository";
import { emitToAccount } from "../config/wsServer/wsEmitter";

export class MessageService {
  private repository: MessageRepository;
  private conversationRepository = new ConversationRepository();

  constructor() {
    this.repository = new MessageRepository();
  }

  public async saveMessage(payload: any) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const messagePayload = {
        ...payload,
      };

      const message = await this.repository.createMessage(
        messagePayload,
        session,
      );

      const conversation = await this.conversationRepository.updateConversation(
        messagePayload.conversationId,
        messagePayload,
        session,
      );

      emitToAccount(payload.accountId, "NEW_MESSAGE", {
        message,
        conversation,
      });

      await session.commitTransaction();
      return message;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }
}
