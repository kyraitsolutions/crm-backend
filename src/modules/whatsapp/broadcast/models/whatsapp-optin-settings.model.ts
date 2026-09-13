import { Document, Schema, Types, model } from "mongoose";
import {
  DEFAULT_OPT_IN_KEYWORDS,
  DEFAULT_OPT_IN_MESSAGE,
  DEFAULT_OPT_OUT_KEYWORDS,
  DEFAULT_OPT_OUT_MESSAGE,
} from "../constants/broadcast.constant.js";

export interface WhatsAppOptInSettings extends Document {
  organizationId: Types.ObjectId;
  accountId: Types.ObjectId;
  skipOptedOutCampaigns: boolean;
  optOut: {
    keywords: string[];
    autoReply: boolean;
    message: string;
  };
  optIn: {
    keywords: string[];
    autoReply: boolean;
    message: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const keywordGroup = {
  keywords: { type: [String], default: [] },
  autoReply: { type: Boolean, default: false },
  message: { type: String, default: "" },
};

const schema = new Schema<WhatsAppOptInSettings>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      unique: true,
    },
    skipOptedOutCampaigns: { type: Boolean, default: true },
    optOut: {
      type: new Schema(keywordGroup, { _id: false }),
      default: () => ({
        keywords: DEFAULT_OPT_OUT_KEYWORDS,
        autoReply: false,
        message: DEFAULT_OPT_OUT_MESSAGE,
      }),
    },
    optIn: {
      type: new Schema(keywordGroup, { _id: false }),
      default: () => ({
        keywords: DEFAULT_OPT_IN_KEYWORDS,
        autoReply: false,
        message: DEFAULT_OPT_IN_MESSAGE,
      }),
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_, ret) {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  },
);

export const WhatsAppOptInSettingsModel = model<WhatsAppOptInSettings>(
  "WhatsAppOptInSettings",
  schema,
);
