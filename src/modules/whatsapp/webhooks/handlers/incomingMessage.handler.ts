import { Types } from "mongoose";
import {
  IntegrationProvider,
  IntegrationStatus,
} from "../../../../models/integration.model.js";
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
          value,
        });

        const integration =
          await this.integrationService.getIntegrationByFilter({
            provider: IntegrationProvider.WHATSAPP,
            providerResourceId: String(phone_number_id),
            status: IntegrationStatus.CONNECTED,
          });

        if (!integration) {
          throw new Error("WhatsApp integration not found.");
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
              },
            },
          });

        await this.contactService.upsertFromLead({
          accountId: String(integration.accountId),
          name: waContactName,
          phone: message.from,
          source: "whatsapp",
        });

        console.log("conversation", conversation);

        // // 2. Build DB document
        const messageDocument = {
          accountId: new Types.ObjectId(integration.accountId),
          conversationId: new Types.ObjectId(conversation.id),
          platform: "whatsapp",
          ...parsedMessage,
        };

        console.log("messageDocument", messageDocument);

        // // 3. Save to MongoDB

        await this.messageService.saveMessage(messageDocument);
      } catch (error) {
        console.log("error", error);
        throw error;
      }
    }
  }
}

export const incomingMessageHandler = new IncomingMessageHandler();
