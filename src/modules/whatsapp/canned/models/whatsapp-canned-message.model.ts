import { Document, Schema, Types, model } from "mongoose";
import {
  CANNED_MESSAGE_STATUS,
  CANNED_MESSAGE_TYPES,
} from "../constants/canned.constant.js";

export interface WhatsAppCannedMessage extends Document {
  organizationId: Types.ObjectId;
  accountId: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdByName: string;
  name: string;
  shortcut: string;
  type: (typeof CANNED_MESSAGE_TYPES)[number];
  text: string;
  category: string;
  status: string;
  favourite: boolean;
  usageCount: number;
  lastUsedAt: Date | null;
  media: {
    url: string;
    key?: string;
    fileName?: string;
    mimeType?: string;
    size?: number;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<WhatsAppCannedMessage>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdByName: { type: String, default: "" },
    name: { type: String, required: true, trim: true },
    shortcut: { type: String, required: true, trim: true, lowercase: true },
    type: {
      type: String,
      enum: CANNED_MESSAGE_TYPES,
      default: "text",
    },
    text: { type: String, default: "" },
    category: { type: String, default: "" },
    status: {
      type: String,
      enum: Object.values(CANNED_MESSAGE_STATUS),
      default: CANNED_MESSAGE_STATUS.PUBLISHED,
    },
    favourite: { type: Boolean, default: false },
    usageCount: { type: Number, default: 0 },
    lastUsedAt: { type: Date, default: null },
    media: {
      type: new Schema(
        {
          url: { type: String, required: true },
          key: String,
          fileName: String,
          mimeType: String,
          size: Number,
        },
        { _id: false },
      ),
      default: null,
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

schema.index({ accountId: 1, shortcut: 1 }, { unique: true });
schema.index({ accountId: 1, usageCount: -1, lastUsedAt: -1 });

export const WhatsAppCannedMessageModel = model<WhatsAppCannedMessage>(
  "WhatsAppCannedMessage",
  schema,
);
