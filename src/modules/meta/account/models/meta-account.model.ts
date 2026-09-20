import { Schema, model } from "mongoose";

const InstagramAccountSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
      index: true,
    },

    username: {
      type: String,
      default: null,
    },

    name: {
      type: String,
      default: null,
    },

    profilePictureUrl: {
      type: String,
      default: null,
    },
  },
  {
    _id: false,
  },
);

const FacebookPageSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
    },

    name: {
      type: String,
      required: true,
    },

    username: {
      type: String,
      default: null,
    },

    category: {
      type: String,
      default: null,
    },

    link: {
      type: String,
      default: null,
    },

    picture: {
      type: String,
      default: null,
    },

    about: {
      type: String,
      default: null,
    },

    description: {
      type: String,
      default: null,
    },

    tasks: {
      type: [String],
      default: [],
    },

    accessToken: {
      type: String,
      default: null,
    },

    webhookSubscribed: {
      type: Boolean,
      default: false,
    },

    instagram: {
      type: InstagramAccountSchema,
      default: null,
    },
  },
  {
    _id: false,
  },
);

const MetaAccountSchema = new Schema(
  {
    integrationId: {
      type: Schema.Types.ObjectId,
      ref: "Integration",
      required: true,
      unique: true,
      index: true,
    },

    facebookPages: {
      type: [FacebookPageSchema],
      default: [],
    },

    activePageId: {
      type: String,
      default: null,
      index: true,
    },

    facebookPage: {
      type: FacebookPageSchema,
      required: true,
    },

    instagram: {
      type: InstagramAccountSchema,
      default: null,
    },

    isConnected: {
      type: Boolean,
      default: true,
    },

    connectedAt: {
      type: Date,
      default: Date.now,
    },

    webhookSubscribed: {
      type: Boolean,
      default: false,
    },

    onboardingCompleted: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

MetaAccountSchema.index({ "facebookPages.id": 1 });
MetaAccountSchema.index({ "facebookPage.id": 1 });

export const MetaAccountModel = model("MetaAccount", MetaAccountSchema);
