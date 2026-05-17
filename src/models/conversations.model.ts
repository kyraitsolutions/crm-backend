import mongoose, { Schema } from "mongoose";

const conversationSchema = new Schema(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },

    visitorId: {
      type: String,
      required: true,
      index: true,
    },

    identifiers: {
      chatbotId: {
        type: Schema.Types.ObjectId,
        ref: "ChatBot",
        index: true,
      },

      whatsappUserId: {
        type: String,
      },

      instagramUserId: {
        type: String,
      },
    },

    platform: {
      type: String,
      enum: [
        "chatbot",
        "whatsapp",
        "instagram",
        "messenger",
        "telegram",
        "email",
      ] as string[],
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["open", "pending", "resolved", "closed", "archived"] as string[],
      default: "open",
      index: true,
    },

    lastMessage: {
      messageId: {
        type: String,
        default: null,
      },

      text: {
        type: String,
        default: null,
      },

      type: {
        type: String,
        default: "text",
      },

      from: {
        type: String,
        enum: ["me", "bot", "user", "system"] as string[],
        default: "user",
      },

      createdAt: {
        type: Date,
        default: Date.now,
      },

      updatedAt: {
        type: Date,
        default: Date.now,
      },
    },

    unreadCount: {
      type: Number,
      default: 0,
    },

    tags: {
      type: String,
      default: null,
    },

    totalMessages: {
      type: Number,
      default: 0,
    },

    isBlocked: {
      type: Boolean,
      default: false,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    metadata: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_, ret) {
        delete (ret as any).__v;
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  },
);

conversationSchema.index(
  {
    visitorId: 1,
    platform: 1,
  },
  {
    unique: true,
  },
);

conversationSchema.index({
  accountId: 1,
  updatedAt: -1,
});

export const ConversationModel = mongoose.model(
  "Conversation",
  conversationSchema,
);
