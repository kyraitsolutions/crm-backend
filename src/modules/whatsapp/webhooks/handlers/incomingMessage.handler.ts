import { Types } from "mongoose";
import { ConversationService } from "../../../../services/conversations.service.js";
import { MessageService } from "../../../../services/messages.service.js";
import { ContactService } from "../../../../services/contact.service.js";
import { ContactRepository } from "../../../../repositories/contact.repository.js";
import logger from "../../../../utils/logger.js";
import { IntegrationService } from "../../../integrations/services/integration.service.js";
import { AUTO_RESOLVE_MODE } from "../../live-chat/constants/live-chat.constant.js";
import { whatsappLiveChatService } from "../../live-chat/services/whatsapp-live-chat.service.js";
import { whatsappBroadcastService } from "../../broadcast/services/whatsapp-broadcast.service.js";
import { whatsappChatflowService } from "../../chatflow/services/whatsapp-chatflow.service.js";
import { enqueueWhatsAppAiAgentJob } from "../../../../queue/whatsapp/ai-agent.queue.js";
import { messageParser } from "../../messages/utils/messages-parser.js";
import type { TConversation } from "../../../../types/conversation.type.js";
import type {
  TIncomingMessageContext,
  TLiveChatAutoResolveResult,
  TParsedWhatsAppMessage,
  TWhatsAppInboundMessage,
  TWhatsAppMessagesValue,
  TWhatsAppWebhookContact,
} from "../types/index.js";

const SKIP_AUTOMATION_TYPES = new Set(["reaction", "unsupported", ""]);

type THandleOneParams = {
  message: TWhatsAppInboundMessage;
  phoneNumberId?: string;
  contacts: TWhatsAppWebhookContact[];
};

export class IncomingMessageHandler {
  private conversationService = new ConversationService();
  private messageService = new MessageService();
  private integrationService = new IntegrationService();
  private contactService = new ContactService(new ContactRepository());

  async handle(value: TWhatsAppMessagesValue) {
    const messages = value.messages ?? [];
    const phoneNumberId = value.metadata?.phone_number_id;
    const contacts = value.contacts ?? [];

    for (const message of messages) {
      try {
        await this.handleOne({ message, phoneNumberId, contacts });
      } catch (error) {
        logger.error("WHATSAPP_INBOUND_FAILED", {
          phoneNumberId,
          messageId: message.id,
          error: (error as Error).message,
        });
      }
    }
  }

  private async handleOne(params: THandleOneParams) {
    const parsedMessage = messageParser.parse({ message: params.message });

    const integration =
      await this.integrationService.resolveWhatsAppByPhoneNumberId(
        String(params.phoneNumberId || ""),
      );

    if (!integration) {
      logger.warn("WHATSAPP_INBOUND_SKIPPED", {
        reason: "integration_not_found",
        phoneNumberId: params.phoneNumberId,
        messageId: parsedMessage.messageId,
      });
      return;
    }

    const contactName =
      params.contacts.find((contact) => contact.wa_id === params.message.from)
        ?.profile?.name || "";

    const { conversation, isNew } =
      await this.conversationService.getOrCreateConversation({
        filter: {
          accountId: new Types.ObjectId(integration.accountId),
          platform: "whatsapp",
          "contact.phoneNumber": params.message.from,
        },
        create: {
          accountId: String(integration.accountId),
          platform: "whatsapp",
          contact: {
            phoneNumber: params.message.from,
            name: contactName || undefined,
          },
        },
      });

    const context: TIncomingMessageContext = {
      accountId: String(integration.accountId),
      organizationId: String(integration.organizationId || ""),
      conversationId: this.conversationId(conversation),
      phone: params.message.from,
      contactName,
      isNewConversation: isNew,
      parsedMessage,
    };

    await this.contactService.upsertFromLead({
      accountId: context.accountId,
      name: contactName,
      phone: context.phone,
      source: "whatsapp",
    });

    await this.persistInbound(context);
    await this.handleBroadcast(context);
    try {
      
      await this.dispatchLiveChat(context);
    } catch (error) {
      logger.error("WHATSAPP_LIVE_CHAT_INBOUND_FAILED", {
        conversationId: context.conversationId,
        error: (error as Error).message,
      });
    }
  }

  private async persistInbound(context: TIncomingMessageContext) {
    try {
      await this.messageService.saveMessage({
        accountId: new Types.ObjectId(context.accountId),
        conversationId: new Types.ObjectId(context.conversationId),
        ...context.parsedMessage,
      });
    } catch (error) {
      if (this.isDuplicateKeyError(error)) return;
      throw error;
    }
  }

  private async handleBroadcast(context: TIncomingMessageContext) {
    const inboundText = this.inboundText(context.parsedMessage);
    if (!inboundText) return;

    await whatsappBroadcastService.markReply(context.accountId, context.phone);
    await whatsappBroadcastService.handleInboundText({
      accountId: context.accountId,
      organizationId: context.organizationId,
      phone: context.phone,
      text: inboundText,
    });
  }

  private async dispatchLiveChat(context: TIncomingMessageContext) {
    const liveChatResult = await whatsappLiveChatService.handleInbound({
      accountId: context.accountId,
      organizationId: context.organizationId,
      conversationId: context.conversationId,
      phone: context.phone,
    });

    console.log("liveChatResult", liveChatResult);

    switch (liveChatResult?.action) { 
      case "welcome":
      case "off_hours":
        logger.info("WHATSAPP_LIVE_CHAT_DISPATCHED", {
          action: liveChatResult.action,
          conversationId: context.conversationId,
        });
        return;
      case "auto_resolve":
        await this.dispatchAutoResolve(context, liveChatResult);
        return;
      default:
        return;
    }
  }

  private async dispatchAutoResolve(
    context: TIncomingMessageContext,
    liveChatResult: TLiveChatAutoResolveResult,
  ) {
    
    switch (liveChatResult.mode) {
      
      case AUTO_RESOLVE_MODE.AI_AGENT:
        await this.enqueueAiAgent(context);
        return;
      case AUTO_RESOLVE_MODE.FLOW:
        await this.runChatflow(context, liveChatResult.chatFlowId);
        return;
      default:
        logger.warn("WHATSAPP_LIVE_CHAT_SKIPPED", {
          reason: "unknown_auto_resolve_mode",
          conversationId: context.conversationId,
          mode: liveChatResult.mode,
        });
    }
  }

  private async enqueueAiAgent(context: TIncomingMessageContext) {
    const inboundType = String(context.parsedMessage.type || "");
    if (
      !context.parsedMessage.messageId ||
      SKIP_AUTOMATION_TYPES.has(inboundType)
    ) {
      logger.info("WHATSAPP_AI_AGENT_SKIPPED", {
        reason: "unsupported_inbound_type",
        conversationId: context.conversationId,
        inboundType,
      });
      return;
    }

    const inboundText =
      this.inboundText(context.parsedMessage) || `[${inboundType}]`;
    const interactive = context.parsedMessage.interactive || {};
    const selectionId = String(
      interactive.button_reply?.id || interactive.list_reply?.id || "",
    ).trim();

    await enqueueWhatsAppAiAgentJob({
      organizationId: context.organizationId,
      accountId: context.accountId,
      conversationId: context.conversationId,
      messageId: String(context.parsedMessage.messageId),
      phone: context.phone,
      inboundText,
      inboundType,
      contactName: context.contactName,
      selectionId,
    });
  }

  private async runChatflow(
    context: TIncomingMessageContext,
    chatFlowId?: string | null,
  ) {
   
    const interactive = context.parsedMessage.interactive || {};
    const inboundText = this.inboundText(context.parsedMessage);

    await whatsappChatflowService.handleInbound({
      accountId: context.accountId,
      organizationId: context.organizationId,
      conversationId: context.conversationId,
      phone: context.phone,
      isNewConversation: context.isNewConversation,
      chatFlowId,
      inboundMessageId: String(context.parsedMessage.messageId || ""),
      inboundType: String(context.parsedMessage.type || "text"),
      reply: {
        text: inboundText,
        interactiveId: String(
          interactive.button_reply?.id ||
            interactive.list_reply?.id ||
            "",
        ),
        interactiveTitle: String(
          interactive.button_reply?.title ||
            interactive.list_reply?.title ||
            inboundText ||
            "",
        ),
      },
    });
  }

  private inboundText(parsedMessage: TParsedWhatsAppMessage) {
    return String(parsedMessage.searchText || parsedMessage.body?.text || "").trim();
  }

  private conversationId(conversation: TConversation | { id?: string; _id?: unknown }) {
    if ("id" in conversation && conversation.id) return String(conversation.id);
    if ("_id" in conversation && conversation._id) return String(conversation._id);
    return "";
  }

  private isDuplicateKeyError(error: unknown) {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    );
  }
}

export const incomingMessageHandler = new IncomingMessageHandler();
