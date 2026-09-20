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
      from: payload.from || context?.from || "agent",
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

      case "template":
        return {
          ...basePayload,
          type: "template",
          body: {
            text: payload.template?.name || "template",
          },
        };

      case "interactive":
        return {
          ...basePayload,
          type: "interactive",
          searchText:
            payload.interactive?.body?.text ||
            payload.searchText ||
            "Interactive Message",
          body: {
            text: payload.interactive?.body?.text || "",
          },
          interactive: payload.interactive,
        };

      default:
        throw new Error(
          `Unsupported message type: ${payload.type} while building payload.`,
        );
    }
  }
}
