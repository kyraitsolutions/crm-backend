import { BuildAudioPayload } from "../builders/whatsapp/buildAudioPayload.js";
import { BuildDocumentPayload } from "../builders/whatsapp/buildDocumentPayload.js";
import { BuildImagePayload } from "../builders/whatsapp/buildImagePayload.js";
import { BuildTextPayload } from "../builders/whatsapp/buildTextPayload.js";
import { BuildVideoPayload } from "../builders/whatsapp/buildVideoPayload.js";

// Payload Service For Whatsapp Messages What Meta Expects
export class MetaPayloadService {
  build(payload: any, media: any) {
    console.log("payload", payload);

    const basePayload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: payload.to,
    };

    switch (payload.type) {
      case "text":
        return {
          ...basePayload,
          ...BuildTextPayload.build(payload),
        };

      case "image": {
        return {
          ...basePayload,
          ...BuildImagePayload.build(payload, media),
        };
      }

      case "video": {
        return {
          ...basePayload,
          ...BuildVideoPayload.build(payload, media),
        };
      }

      case "document": {
        return {
          ...basePayload,
          ...BuildDocumentPayload.build(payload, media),
        };
      }

      case "audio": {
        return {
          ...basePayload,
          ...BuildAudioPayload.build(payload, media),
        };
      }

      default:
        throw new Error(`Unsupported message type: ${payload.type}`);
    }
  }
}

export const metaPayloadService = new MetaPayloadService();
