import mongoose from "mongoose";
import { ConversationRepository } from "../repositories/conversations.repository";
import { MessageRepository } from "../repositories/messages.repository";
import { emitToAccount } from "../config/wsServer/wsEmitter";
import { NotificationRepository } from "../repositories/notification.repository";
import { AccountRepository } from "../repositories/account.repository";

export class MessageService {
  private repository: MessageRepository;
  private conversationRepository = new ConversationRepository();
   private accountRepository= new AccountRepository();
  private notificationRepository=new NotificationRepository();

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

      console.log("conversation", conversation)

      if(conversation?._id){
        console.log("Msg payload",messagePayload)
        const account =await this.accountRepository.findOne(messagePayload.accountId);
        if(!account) return null;
        console.log("sjhfsdf", account)

        const notificationPayload = {
          organizationId: account.organizationId,
          title:`Customer initiated a new chat on ${payload.platform}`,
          description:"",
          accountId:payload.accountId,
          typeId:String(conversation?._id) ||"",
          type:"message" as const,
          channelType:payload.platform as "chatbot" | "instagram" | "facebook" | "whatsapp",
          meta:payload
        };
        const notification= await this.notificationRepository.findByTypeIdAndUpdate(notificationPayload,session)
      }

      
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
