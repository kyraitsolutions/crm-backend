import { Schema, model, Types } from "mongoose";

export type TMessageDirection = "inbound" | "outbound";

export type TMessageStatus =
  | "pending"
  | "queued"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

export const MESSAGE_STATUS: TMessageStatus[] = [
  "pending",
  "queued",
  "sent",
  "delivered",
  "read",
  "failed",
];

type TMessageType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "document"
  | "sticker"
  | "reaction"
  | "location"
  | "contact"
  | "template"
  | "interactive"
  | "question";

export const MESSAGE_TYPES: TMessageType[] = [
  "text",
  "image",
  "video",
  "audio",
  "document",
  "sticker",
  "reaction",
  "location",
  "contact",
  "template",
  "interactive",
  "question",
];

const MessageSchema = new Schema(
  {
    conversationId: {
      type: Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },

    chatbotId: {
      type: Types.ObjectId,
      ref: "Chatbot",
      index: true,
    },

    messageId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    body: {
      text: String,
    },

    context: {
      messageId: String,
      message: String,
    },

    media: {
      type: {
        type: String,
        enum: ["image", "video", "audio", "document"],
      },
      image: {
        id: String,
        link: String,
        caption: String,
        size: Number,
        mimetype: String,
      },
      video: {
        id: String,
        link: String,
        size: Number,
        mimetype: String,
      },
      document: {
        id: String,
        link: String,
        size: Number,
        mimetype: String,
      },
    },

    interactive: Schema.Types.Mixed,

    template: {
      name: String,
      language: String,
      category: {
        type: String,
        enum: ["marketing", "utility", "authentication"],
      },
      components: [Schema.Types.Mixed],
    },

    platform: {
      type: String,
      enum: ["whatsapp", "instagram", "chatbot"],
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: MESSAGE_TYPES,
      required: true,
    },

    direction: {
      type: String,
      enum: ["inbound", "outbound"],
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: MESSAGE_STATUS,
      default: "pending",
      index: true,
    },

    pricing: {
      billable: {
        type: Boolean,
        default: false,
      },
      pricingModel: {
        type: String,
        enum: ["conversation", "template"],
      },
      category: {
        type: String,
        enum: ["marketing", "utility", "authentication", "service"],
      },
      price: Number,
      currency: {
        type: String,
        default: "INR",
      },
    },

    analytics: {
      deliveredAt: Date,
      readAt: Date,
      repliedAt: Date,
      clickedAt: Date,
      failedAt: Date,
      responseTimeMs: Number,
      //   retryCount: {
      //     type: Number,
      //     default: 0,
      //   },
    },

    error: {
      code: String,
      message: String,
    },

    metadata: {
      source: String,
      campaignId: String,
      workflowId: String,
      nodeId: String,
    },
  },
  {
    timestamps: true,
  },
);

export const MessageModel = model("Message", MessageSchema);
