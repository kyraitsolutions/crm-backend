import { IntegrationProvider } from "../../../../models/integration.model.js";
import { MessageRepository } from "../../../../repositories/messages.repository.js";
import { conversationService } from "../../../../services/conversations.service.js";
import { IntegrationCredentialRepository } from "../../../integrations/repositories/integration-credential.repository.js";
import { IntegrationRepository } from "../../../integrations/repositories/integration.repository.js";
import { WhatsAppAccountRepository } from "../../account/repositories/whatsapp-account.repository.js";
import { WhatsappMessageClient } from "../client/whatsapp-message.client.js";
import { mediaService } from "./media.service.js";
import { MessagePayloadService } from "./message-payload.service.js";
import { metaPayloadService } from "./meta-payload.service.js";

export class WhatsappMessageService {
  private integrationRepository = new IntegrationRepository();
  private integrationCredentialRepository =
    new IntegrationCredentialRepository();
  private whatsappAccountRepository = new WhatsAppAccountRepository();
  private whatsappMessageClient = new WhatsappMessageClient();
  private messageRepository = new MessageRepository();

  constructor() {
    this.integrationRepository = new IntegrationRepository();
    this.integrationCredentialRepository =
      new IntegrationCredentialRepository();
    this.whatsappAccountRepository = new WhatsAppAccountRepository();
    this.messageRepository = new MessageRepository();
  }

  async send(accountId: string, payload: any) {
    // 1. Find Integration
    const integration =
      await this.integrationRepository.findByAccountAndProvider(
        accountId,
        IntegrationProvider.WHATSAPP,
      );

    if (!integration) {
      throw new Error("WhatsApp integration not found.");
    }

    // 2. Get Access Token
    const credential =
      await this.integrationCredentialRepository.findByIntegrationId(
        integration._id.toString(),
      );

    if (!credential?.accessToken) {
      throw new Error("WhatsApp access token not found.");
    }

    // 3. Get WhatsApp Account By Phone Number Id
    const whatsappAccount =
      await this.whatsappAccountRepository.findByPhoneNumberId(
        integration?.providerResourceId,
      );

    if (!whatsappAccount) {
      throw new Error("WhatsApp account not found.");
    }

    // 4. Get Or Create Conversation
    const conversation = await conversationService.getOrCreateConversation({
      filter: {
        accountId,
        platform: "whatsapp",
        "identifiers.whatsappUserId": payload.to,
      },

      create: {
        accountId,
        platform: "whatsapp",

        identifiers: {
          whatsappUserId: payload.to,
        },

        contact: {
          phoneNumber: payload.to,
        },

        status: "open",
      },
    });

    let media: any = null;

    if (
      ["image", "video", "audio", "document", "sticker"].includes(payload.type)
    ) {
      media = await mediaService.resolve({
        media: payload[payload.type],
        file: payload.file,
        phoneNumberId: whatsappAccount.phoneNumberInfo.id,
        accessToken: credential.accessToken,
      });
    }

    console.log("media", media);

    const metaPayload = metaPayloadService.build(payload, media);

    console.log("metaPayload", metaPayload);

    const result = await this.whatsappMessageClient.sendMessage({
      accessToken: credential.accessToken,
      phoneNumberId: whatsappAccount?.phoneNumberInfo?.id,
      payload: metaPayload,
    });

    const messagePayload = await MessagePayloadService.build(payload, {
      conversationId: conversation?.id,
      accountId: accountId,
      messageId: result.messages[0].id,
      media: media,
    });

    console.log("messagePayload", messagePayload);

    await this.messageRepository.createMessage(messagePayload as any);

    return {
      doc: result,
    };
  }

  async getMedia(accountId: string, mediaId: string) {
    if (!mediaId) {
      throw new Error("Media ID is required.");
    }

    // 1. Find WhatsApp Integration
    const integration =
      await this.integrationRepository.findByAccountAndProvider(
        accountId,
        IntegrationProvider.WHATSAPP,
      );

    if (!integration) {
      throw new Error("WhatsApp integration not found.");
    }

    // 2. Get Access Token
    const credential =
      await this.integrationCredentialRepository.findByIntegrationId(
        integration._id.toString(),
      );

    if (!credential?.accessToken) {
      throw new Error("WhatsApp access token not found.");
    }

    // 3. Get Media Details From Meta
    const media = await this.whatsappMessageClient.getMedia({
      accessToken: credential.accessToken,
      mediaId,
    });

    // 4. Download Binary
    return this.whatsappMessageClient.downloadMedia({
      accessToken: credential.accessToken,
      url: media.url,
    });

    return media;
  }
}
