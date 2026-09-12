import { Types } from "mongoose";
import {
  IntegrationProvider,
  IntegrationStatus,
} from "../../../../models/integration.model.js";
import { ConversationService } from "../../../../services/conversations.service.js";
import { MessageService } from "../../../../services/messages.service.js";
import { IntegrationService } from "../../../integrations/services/integration.service.js";
import { messageParser } from "../../messages/utils/messages-parser.js";

export class IncomingMessageHandler {
  private conservationService = new ConversationService();
  private messageService = new MessageService();
  private integrationService = new IntegrationService();

  constructor() {
    this.conservationService = new ConversationService();
    this.messageService = new MessageService();
    this.integrationService = new IntegrationService();
  }
  async handle(value: any) {
    const messages = value.messages ?? [];
    const { phone_number_id } = value?.metadata ?? {};

    for (const message of messages) {
      try {
        const parsedMessage = messageParser.parse({
          message,
        });

        // 1. Find Integration
        const integration =
          await this.integrationService.getIntegrationByFilter({
            provider: IntegrationProvider.WHATSAPP,
            providerResourceId: String(phone_number_id),
            status: IntegrationStatus.CONNECTED,
          });

        if (!integration) {
          throw new Error(
            `WhatsApp Integration not found for ${phone_number_id}`,
          );
        }

        // 1. Find/create conversation
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

        // 2. Build DB document
        const messageDocument = {
          accountId: new Types.ObjectId(integration.accountId),
          conversationId: new Types.ObjectId(conversation.id),
          // platform: "whatsapp",
          ...parsedMessage,
        };

        // 3. Save to MongoDB
        await this.messageService.saveMessage(messageDocument);
      } catch (error) {
        console.log("error", error);
        throw error;
      }
    }
  }
}

export const incomingMessageHandler = new IncomingMessageHandler();
