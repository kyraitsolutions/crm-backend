import { BuildMediaMessagePayload } from "../builders/database/buildMediaMessage.payload.js";
import { BuildTextMessagePayload } from "../builders/database/buildTextMessagePayload.js";

export class MessagePayloadService {
  static build(payload: any, context: any) {
    const basePayload = {
      accountId: context.accountId,
      conversationId: context.conversationId,
      messageId: context.messageId,
      platform: "whatsapp",
      direction: "outbound",
      type: payload.type,
      status: "sent",
      from: context?.from || "agent",
    };
    switch (payload.type) {
      case "text":
        return {
          ...basePayload,
          ...BuildTextMessagePayload.build(payload),
        };

      case "image":
      case "video":
      case "document":
      case "audio":
        return {
          ...basePayload,
          ...BuildMediaMessagePayload.build(payload, context),
        };

      default:
        throw new Error(
          `Unsupported message type: ${payload.type} while building payload.`,
        );
    }
  }
}
