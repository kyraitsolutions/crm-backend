import { z } from "zod";

const TMessageType = z.enum([
  "text",
  "image",
  "video",
  "document",
  "audio",
  "template",
  "location",
  "contact",
  "reaction",
  "sticker",
  "interactive",
  "question",
]);

export type TMessageType = z.infer<typeof TMessageType>;

const TMessageStatus = z.enum([
  "sent",
  "delivered",
  "read",
  "failed",
  "pending",
]);

const MessageFromSchema = z.enum(["me", "user", "bot"]);

export const BaseMessageSchema = z.object({
  messageId: z.string(),
  conversationId: z.string(),
  accountId: z.string(),
  visitorId: z.string(),
  chatbotId: z.string().optional(),
  from: MessageFromSchema,
  type: TMessageType,
  status: TMessageStatus,
  direction: z.enum(["inbound", "outbound"]),
  platform: z.enum(["whatsapp", "instagram", "chatbot"]),
  context: z
    .object({
      messageId: z.string().optional(),
      message: z.string().optional(),
    })
    .optional(),
});

export const TextMessageSchema = BaseMessageSchema.extend({
  type: z.literal("text"),
  body: z.object({
    text: z.string(),
  }),
});

export const ImageMessageSchema = BaseMessageSchema.extend({
  type: z.literal("image"),

  media: z.object({
    type: "image",
    image: z.object({
      link: z.string().optional(),
      id: z.string().optional(),
      caption: z.string().optional(),
    }),
  }),
});

export const VideoMessageSchema = BaseMessageSchema.extend({
  type: z.literal("video"),
  media: z.object({
    type: "video",
    video: z.object({
      link: z.string().optional(),
      id: z.string().optional(),
      caption: z.string().optional(),
    }),
  }),
});

export const DocumentMessageSchema = BaseMessageSchema.extend({
  type: z.literal("document"),
  media: z.object({
    type: "document",
    document: z.object({
      link: z.string().optional(),
      id: z.string().optional(),
      caption: z.string().optional(),
    }),
  }),
});

// export const InteractiveButtonMessageSchema = BaseMessageSchema.extend({
//   type: z.literal("interactive"),
//   interactive: ButtonNodeDataPayloadSchema.shape.interactive,
// });

// export const InteractiveListMessageSchema = BaseMessageSchema.extend({
//   type: z.literal("interactive"),
//   interactive: ListNodeDataPayloadSchema.shape.interactive,
// });

// export const QuestionMessageSchema = BaseMessageSchema.extend({
//   type: z.literal("question"),
//   question: QuestionNodeDataPayloadSchema.shape.question,
// });

export const MessageSchema = z.union([
  TextMessageSchema,
  ImageMessageSchema,
  VideoMessageSchema,
  DocumentMessageSchema,
  //   InteractiveButtonMessageSchema,
  //   InteractiveListMessageSchema,
  //   QuestionMessageSchema,
]);

export type TMessage = z.infer<typeof MessageSchema>;
