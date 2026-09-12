import { Types } from "mongoose";
import {
  IntegrationProvider,
  IntegrationStatus,
} from "../../../../models/integration.model.js";
import { ConversationService } from "../../../../services/conversations.service.js";
import { MessageService } from "../../../../services/messages.service.js";
import { IntegrationService } from "../../../integrations/services/integration.service.js";
import { messageParser } from "../../messages/utils/messages-parser.js";

export class MessageEchoHandler {
  private conversationService = new ConversationService();
  private messageService = new MessageService();
  private integrationService = new IntegrationService();

  async handle(value: any) {
    const echoes = value?.message_echoes ?? [];
    const { phone_number_id } = value?.metadata ?? {};

    for (const echo of echoes) {
      try {
        const integration =
          await this.integrationService.getIntegrationByFilter({
            provider: IntegrationProvider.WHATSAPP,
            providerResourceId: String(phone_number_id),
            status: IntegrationStatus.CONNECTED,
          });

        if (!integration) {
          throw new Error(
            `WhatsApp integration not found for ${phone_number_id}`,
          );
        }

        // Message deleted from mobile
        if (echo.type === "revoke") {
          await this.handleRevoke(echo);
          continue;
        }

        // Normal outgoing mobile message
        await this.handleMessage(echo, integration);
      } catch (error) {
        console.error("Message echo error:", error);
        throw error;
      }
    }
  }

  private async handleRevoke(echo: any) {
    const originalMessageId = echo?.revoke?.original_message_id;

    if (!originalMessageId) {
      return;
    }

    await this.messageService.deleteMessage(originalMessageId);
  }

  private async handleMessage(echo: any, integration: any) {
    const conversation = await this.conversationService.getOrCreateConversation(
      {
        filter: {
          accountId: new Types.ObjectId(integration.accountId),
          platform: "whatsapp",
          "contact.phoneNumber": echo.to,
        },

        create: {
          accountId: String(integration.accountId),
          platform: "whatsapp",
          contact: {
            phoneNumber: echo.to,
          },
        },
      },
    );

    const parsedMessage = messageParser.parse({
      message: echo,
      from: "agent",
      direction: "outbound",
    });

    const messageDocument = {
      accountId: new Types.ObjectId(integration.accountId),
      conversationId: new Types.ObjectId(conversation.id),
      // platform: "whatsapp",
      ...parsedMessage,
    };

    await this.messageService.saveMessage(messageDocument);
  }
}

export const messageEchoHandler = new MessageEchoHandler();

// import { Types } from "mongoose";
// import {
//   IntegrationProvider,
//   IntegrationStatus,
// } from "../../../../models/integration.model.js";
// import { ConversationService } from "../../../../services/conversations.service.js";
// import { MessageService } from "../../../../services/messages.service.js";
// import { IntegrationService } from "../../../integrations/services/integration.service.js";
// import { messageParser } from "../../messages/utils/messages-parser.js";

// export class MessageEchoHandler {
//   private conversationService = new ConversationService();
//   private messageService = new MessageService();
//   private integrationService = new IntegrationService();

//   async handle(value: any) {
//     console.log("MESSAGE ECHO VALUE:", JSON.stringify(value, null, 2));

//     const { phone_number_id } = value?.metadata ?? {};

//     // IMPORTANT:
//     // First inspect the actual smb_message_echoes payload
//     // to know where the recipient/customer is located.

//     const echoes = value?.message_echoes ?? [];
//     console.log("echoes", echoes);

//     for (const echo of echoes) {
//       try {
//         // ------------------------------------------------
//         // 1. Find Integration
//         // ------------------------------------------------

//         const integration =
//           await this.integrationService.getIntegrationByFilter({
//             provider: IntegrationProvider.WHATSAPP,
//             providerResourceId: String(phone_number_id),
//             status: IntegrationStatus.CONNECTED,
//           });

//         if (!integration) {
//           throw new Error(
//             `WhatsApp integration not found for ${phone_number_id}`,
//           );
//         }

//         // ------------------------------------------------
//         // 2. Find customer phone number
//         // ------------------------------------------------

//         const customerPhoneNumber = echo.to;

//         if (!customerPhoneNumber) {
//           console.log("Customer phone number not found in echo", echo);
//           continue;
//         }

//         // ------------------------------------------------
//         // 3. Find/Create conversation
//         // ------------------------------------------------

//         const conversation =
//           await this.conversationService.getOrCreateConversation({
//             filter: {
//               accountId: new Types.ObjectId(integration.accountId),
//               platform: "whatsapp",
//               "contact.phoneNumber": customerPhoneNumber,
//             },

//             create: {
//               accountId: String(integration.accountId),

//               platform: "whatsapp",

//               contact: {
//                 phoneNumber: customerPhoneNumber,
//               },
//             },
//           });

//         // ------------------------------------------------
//         // 4. Parse echo message
//         // ------------------------------------------------

//         const parsedMessage = messageParser.parse({
//           message: echo,
//           from: "agent",
//         });

//         // ------------------------------------------------
//         // 5. Build DB document
//         // ------------------------------------------------

//         const messageDocument = {
//           accountId: new Types.ObjectId(integration.accountId),
//           conversationId: new Types.ObjectId(conversation.id),
//           platform: "whatsapp",
//           ...parsedMessage,
//         };

//         // ------------------------------------------------
//         // 6. Save message
//         // ------------------------------------------------

//         await this.messageService.saveMessage(messageDocument);
//       } catch (error) {
//         console.log("Message echo handling error", error);
//         throw error;
//       }
//     }
//   }
// }

// export const messageEchoHandler = new MessageEchoHandler();
