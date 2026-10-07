// This MessageParser is used to parse WhatsApp incoming messages into a common format that can be matched with existing DB messages schema

import type { TWhatsAppWebhookMessage } from "../../webhooks/types/index.js";

class MessageParser {
  parse({
    message,
    from = "user",
    direction = "inbound",
  }: {
    message: TWhatsAppWebhookMessage;
    from?: "agent" | "user";
    direction?: "inbound" | "outbound";
  }) {
    const base = {
      messageId: message.id,
      from: from,
      direction: direction,
      platform: "whatsapp" as const,
      status: "sent",
      searchText: message.text?.body ?? "",
    };

    switch (message.type) {
      case "text":
        return {
          ...base,
          type: "text",
          body: {
            text: message.text?.body ?? "",
          },
        };

      case "image":
        return {
          ...base,
          searchText: message.image?.caption || message.image?.id || "image",
          type: "image",
          media: {
            type: "image",
            image: {
              id: message.image?.id,
              link: message.image?.link,
              caption: message.image?.caption,
              mime_type: message.image?.mime_type,
            },
          },
        };

      case "video":
        return {
          ...base,
          searchText: message.video?.id || "video",
          type: "video",
          media: {
            type: "video",
            video: {
              id: message.video?.id,
              link: message.video?.link,
              mime_type: message.video?.mime_type,
            },
          },
        };

      case "audio":
        return {
          ...base,
          type: "audio",
          media: {
            type: "audio",
            audio: {
              id: message.audio?.id,
              link: message.audio?.link,
              mime_type: message.audio?.mime_type,
            },
          },
        };

      case "document":
        return {
          ...base,
          searchText: message.document?.filename || message.document?.id || "document",
          type: "document",
          media: {
            type: "document",
            document: {
              id: message.document?.id,
              link: message.document?.link,
              mime_type: message.document?.mime_type,
            },
          },
        };

      case "interactive": {
        const reply =
          message.interactive?.button_reply?.title ||
          message.interactive?.list_reply?.title ||
          message.interactive?.nfm_reply?.response_json ||
          "";
        return {
          ...base,
          type: "interactive",
          searchText: String(reply),
          body: { text: String(reply) },
          interactive: message.interactive,
        };
      }

      case "button": {
        const text = message.button?.text || message.button?.payload || "";
        return {
          ...base,
          type: "interactive",
          searchText: String(text),
          body: { text: String(text) },
          interactive: {
            type: "button_reply",
            button_reply: {
              id: message.button?.payload || "",
              title: message.button?.text || "",
            },
          },
        };
      }

      case "location": {
        const location = message.location;
        const label = [location?.name, location?.address].filter(Boolean).join(", ");
        const coords = [location?.latitude, location?.longitude].filter((value) => value != null).join(",");
        const text = label || coords || "location";
        return {
          ...base,
          type: "location",
          searchText: text,
          body: { text },
          location,
        };
      }

      case "reaction":
        return {
          ...base,
          type: "reaction",
          interactive: message.reaction,
        };

      default:
        // console.warn(`Unsupported WhatsApp message type: ${message.type}`);
        return {
          ...base,
          type: "unsupported",
        };
    }
  }
}

export const messageParser = new MessageParser();
