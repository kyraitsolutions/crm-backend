import mongoose from "mongoose";
import { emitToAccount } from "../config/wsServer/wsEmitter";
import { ConversationRepository } from "../repositories/conversations.repository";
import { MessageRepository } from "../repositories/messages.repository";
import { buildMessageSearchText } from "../utils/buildMessageSearchTextPayload";

export class MessageService {
  private messageRepository: MessageRepository;
  private conversationRepository = new ConversationRepository();

  constructor() {
    this.messageRepository = new MessageRepository();
  }

  public async getMessagesByConversationId(conversationId: string) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const messages =
        await this.messageRepository.getMessagesByConversationId(
          conversationId,
        );
      await this.conversationRepository.updateConversation(
        conversationId,
        { unreadCount: 0 },
        {
          session,
          resetUnread: true,
          incrementUnread: false,
          updateLastMessage: false,
        },
      );
      await session.commitTransaction();
      return messages;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    }
  }
  public async saveMessage(payload: any) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const searchText = buildMessageSearchText(payload);
      const messagePayload = {
        ...payload,
        searchText,
      };

      const message = await this.messageRepository.createMessage(
        messagePayload,
        session,
      );

      const conversation = await this.conversationRepository.updateConversation(
        messagePayload.conversationId,
        messagePayload,
        {
          session,
        },
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
