import { Schema, model } from "mongoose";

const WhatsAppBusinessProfileSchema = new Schema(
  {
    about: String,
    address: String,
    description: String,
    email: String,
    websites: [String],
    vertical: String,
    profilePictureUrl: String,
  },
  {
    _id: false,
  },
);

const BusinessInfoSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
    },

    name: {
      type: String,
      required: true,
    },
  },
  {
    _id: false,
  },
);

const WabaInfoSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
    },

    timezone: {
      type: String,
    },

    marketingMessagesOnboardingStatus: {
      type: String,
      default: null,
    },
  },
  {
    _id: false,
  },
);

const PhoneNumberInfoSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },

    displayPhoneNumber: {
      type: String,
      required: true,
    },

    verifiedName: {
      type: String,
    },

    qualityRating: {
      type: String,
      default: null,
    },

    messagingLimitTier: {
      type: String,
      default: null,
    },

    accountMode: {
      type: String,
      default: null,
    },

    platformType: {
      type: String,
      default: null,
    },

    codeVerificationStatus: {
      type: String,
      default: null,
    },

    nameStatus: {
      type: String,
      default: null,
    },

    newNameStatus: {
      type: String,
      default: null,
    },

    isOfficialBusinessAccount: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: false,
  },
);

const WhatsAppAccountSchema = new Schema(
  {
    integrationId: {
      type: Schema.Types.ObjectId,
      ref: "Integration",
      required: true,
      unique: true,
      index: true,
    },

    businessInfo: {
      type: BusinessInfoSchema,
      required: true,
    },

    wabaInfo: {
      type: WabaInfoSchema,
      required: true,
    },

    phoneNumberInfo: {
      type: PhoneNumberInfoSchema,
      required: true,
    },

    profile: {
      type: WhatsAppBusinessProfileSchema,
      default: {},
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

    lastProfileSyncAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    // toJSON: {
    //   transform(_, ret) {
    //     delete (ret as any).__v;
    //     ret.id = ret._id;
    //     delete ret._id;
    //     return ret;
    //   },
    // },
  },
);

export const WhatsAppAccountModel = model(
  "WhatsAppAccount",
  WhatsAppAccountSchema,
);
