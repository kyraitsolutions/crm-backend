import { HttpError } from "../utils/http.error.js";
import mongoose from "mongoose";
import { emitToAccount } from "../config/wsServer/wsEmitter.js";
import { ConversationRepository } from "../repositories/conversations.repository.js";
import { MessageRepository } from "../repositories/messages.repository.js";
import { buildMessageSearchText } from "../utils/buildMessageSearchTextPayload.js";
import { TPaginatedResponse } from "../types/api-response.type.js";
import { TMessage } from "../types/message.type.js";
import { notificationService } from "../container.js";
import { AccountRepository } from "../repositories/account.repository.js";

export class MessageService {
  private messageRepository: MessageRepository;
  private conversationRepository = new ConversationRepository();
  private accountRepository = new AccountRepository();

  constructor() {
    this.messageRepository = new MessageRepository();
  }

  public async getMessagesByConversationId(
    conversationId: string,
  ): Promise<TPaginatedResponse<TMessage>> {
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
      return {
        docs: messages,
      };
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

      if (payload.direction === "inbound") {
        const accountId = String(payload.accountId || "");
        const account = await this.accountRepository.findOne(accountId);
        const convo = conversation as any;
        const preview =
          payload?.text?.body ||
          payload?.searchText ||
          convo?.lastMessage?.text ||
          "";
        if (account?.organizationId) {
          await notificationService.notifyConversation({
            organizationId: String(account.organizationId),
            accountId,
            conversationId: String(payload.conversationId || convo?.id || ""),
            platform: String(payload.platform || convo?.platform || "whatsapp"),
            isNew: false,
            phone: convo?.contact?.phoneNumber,
            contactName: convo?.contact?.name,
            preview: String(preview).slice(0, 140),
          });
        }
      }

      await session.commitTransaction();
      return message;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  public async updateMessage(messageId: string, payload: any) {
    const message = await this.messageRepository.updateMessage(
      { messageId: messageId },
      payload,
    );

    if (!message) throw HttpError.notFound("Message not found");

    const conversation = await this.conversationRepository.updateConversation(
      String(message.conversationId),
      {
        messageId: String(message.messageId),
        type: message.type,
        body: message.body,
        status: message.status,
        from: message.from,
      },
    );

    emitToAccount(String(message?.accountId), "UPDATE_MESSAGE", {
      message: message.toJSON(),
      conversation,
    });

    return message;
  }

  public async deleteMessage(messageId: string) {
    const message =
      await this.messageRepository.deleteMessageByMessageId(messageId);
    return message;
  }
}
