import { Types } from "mongoose";
import { ConversationService } from "../../../../services/conversations.service.js";
import { MessageService } from "../../../../services/messages.service.js";
import { ContactService } from "../../../../services/contact.service.js";
import { ContactRepository } from "../../../../repositories/contact.repository.js";
import { IntegrationService } from "../../../integrations/services/integration.service.js";
import { messageParser } from "../../messages/utils/messages-parser.js";

export class IncomingMessageHandler {
  private conservationService = new ConversationService();
  private messageService = new MessageService();
  private integrationService = new IntegrationService();
  private contactService = new ContactService(new ContactRepository());

  constructor() {
    this.conservationService = new ConversationService();
    this.messageService = new MessageService();
    this.integrationService = new IntegrationService();
    this.contactService = new ContactService(new ContactRepository());
  }
  async handle(value: any) {
    const messages = value.messages ?? [];
    const { phone_number_id } = value?.metadata ?? {};
    const waContacts = value.contacts ?? [];

    for (const message of messages) {
      try {
        const parsedMessage = messageParser.parse({
          message,
        });

        const integration =
          await this.integrationService.resolveWhatsAppByPhoneNumberId(
            String(phone_number_id),
          );

        if (!integration) {
          console.warn("WHATSAPP_WEBHOOK_SKIPPED", {
            reason: "integration_not_found",
            phoneNumberId: phone_number_id,
            messageId: parsedMessage.messageId,
          });
          continue;
        }

        const waContactName =
          waContacts.find((contact: any) => contact?.wa_id === message.from)
            ?.profile?.name || "";

        const conversation =
          await this.conservationService.getOrCreateConversation({
            filter: {
              accountId: new Types.ObjectId(integration.accountId),
              platform: "whatsapp",
              "contact.phoneNumber": message.from,
            },
            create: {
              accountId: String(integration.accountId),
              platform: "whatsapp",
              contact: {
                phoneNumber: message.from,
                name: waContactName || undefined,
              },
            },
          });

        await this.contactService.upsertFromLead({
          accountId: String(integration.accountId),
          name: waContactName,
          phone: message.from,
          source: "whatsapp",
        });

        // // 2. Build DB document
        const messageDocument = {
          accountId: new Types.ObjectId(integration.accountId),
          conversationId: new Types.ObjectId(conversation.id),
          // platform: "whatsapp",
          ...parsedMessage,
        };

        // 3. Save to MongoDB (unique messageId makes webhook retries idempotent)
        try {
          await this.messageService.saveMessage(messageDocument);
        } catch (saveError: any) {
          if (saveError?.code !== 11000) throw saveError;
        }

        const inboundText = parsedMessage
          ? parsedMessage.searchText ||
            ("body" in parsedMessage ? parsedMessage.body?.text : "") ||
            ""
          : "";
        if (inboundText) {
          const { whatsappBroadcastService } =
            await import("../../broadcast/services/whatsapp-broadcast.service.js");
          await whatsappBroadcastService.markReply(
            String(integration.accountId),
            message.from,
          );
          await whatsappBroadcastService.handleInboundText({
            accountId: String(integration.accountId),
            organizationId: String(integration.organizationId || ""),
            phone: message.from,
            text: inboundText,
          });
        }

        try {
          const { whatsappLiveChatService } = await import(
            "../../live-chat/services/whatsapp-live-chat.service.js"
          );
          const conversationId = String(
            conversation.id || (conversation as any)._id || "",
          );
          const liveChatResult = await whatsappLiveChatService.handleInbound({
            accountId: String(integration.accountId),
            organizationId: String(integration.organizationId || ""),
            conversationId,
            phone: message.from,
          });

          const skipAgentTypes = ["reaction", "unsupported", ""];
          const agentText =
            String(inboundText || parsedMessage.searchText || "") ||
            (parsedMessage.type && !skipAgentTypes.includes(String(parsedMessage.type))
              ? `[${parsedMessage.type}]`
              : "");
          if (
            liveChatResult?.action === "auto_resolve" &&
            liveChatResult.mode === "ai_agent" &&
            parsedMessage.messageId &&
            !skipAgentTypes.includes(String(parsedMessage.type || ""))
          ) {
            const { enqueueWhatsAppAiAgentJob } = await import(
              "../../../../queue/whatsapp/ai-agent.queue.js"
            );
            await enqueueWhatsAppAiAgentJob({
              organizationId: String(integration.organizationId || ""),
              accountId: String(integration.accountId),
              conversationId,
              messageId: String(parsedMessage.messageId),
              phone: message.from,
              inboundText: agentText,
              inboundType: String(parsedMessage.type || "text"),
              contactName: waContactName,
            });
          }
        } catch (liveChatError) {
          console.log("live chat inbound error", liveChatError);
        }
      } catch (error) {
        console.log("incoming message error", error);
      }
    }
  }
}

export const incomingMessageHandler = new IncomingMessageHandler();
