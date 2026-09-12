// This MessageParser is used to parse WhatsApp incoming messages into a common format that can be matched with existing DB messages schema

class MessageParser {
  parse({
    message,
    from = "user",
    direction = "inbound",
  }: {
    message: any;
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

      case "reaction":
        return {
          ...base,
          type: "",
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
