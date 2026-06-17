import { model, Schema } from "mongoose";

const visitorSchema = new Schema(
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

    platform: {
      type: String,
      enum: [
        "chatbot",
        "whatsapp",
        "instagram",
        "messenger",
        "telegram",
        "email",
      ],
      required: true,
      index: true,
    },

    identifiers: {
      chatbotId: {
        type: String,
      },

      whatsappUserId: {
        type: String,
      },

      instagramUserId: {
        type: String,
      },
    },

    profile: {
      displayName: {
        type: String,
      },

      avatar: {
        type: String,
      },

      email: {
        type: String,
      },

      phone: {
        type: String,
      },
    },

    firstSeenAt: {
      type: Date,
      default: Date.now,
    },

    lastSeenAt: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      enum: ["online", "offline"],
      default: "online",
    },

    totalConversations: {
      type: Number,
      default: 0,
    },

    metadata: {
      type: Object,
      default: {},
    },

    isBlocked: {
      type: Boolean,
      default: false,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    totalVisit: {
      type: Number,
      default: 1,
    },
  },

  {
    timestamps: true,
    versionKey: false,
    // toJSON: {
    //   transform(_, ret) {
    //     ret.id = ret._id.toString();
    //     delete ret._id;
    //     return ret;
    //   },
    // },
  },
);

visitorSchema.index(
  {
    accountId: 1,
    platform: 1,
    visitorId: 1,
  },
  {
    unique: true,
  },
);

export const VisitorModel = model("Visitor", visitorSchema);
