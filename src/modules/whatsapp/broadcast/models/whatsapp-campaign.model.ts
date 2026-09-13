import { Document, Schema, Types, model } from "mongoose";
import { WHATSAPP_CAMPAIGN_STATUS } from "../constants/broadcast.constant.js";

export interface WhatsAppCampaign extends Document {
  organizationId: Types.ObjectId;
  accountId: Types.ObjectId;
  name: string;
  templateId: Types.ObjectId;
  templateName: string;
  templateLanguage: string;
  templateCategory: string;
  status: string;
  audience: {
    mode: "contacts" | "filters" | "all";
    contactIds: string[];
    filters: Record<string, unknown>;
  };
  excludeOptedOut: boolean;
  timezone?: string;
  scheduledAt?: Date;
  queuedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  pausedAt?: Date;
  canceledAt?: Date;
  resendOf?: Types.ObjectId;
  audienceCount: number;
  eligibleCount: number;
  excludedCount: number;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  repliedCount: number;
  failedCount: number;
  optedOutCount: number;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<WhatsAppCampaign>(
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
    name: { type: String, required: true, trim: true },
    templateId: {
      type: Schema.Types.ObjectId,
      ref: "WhatsappTemplate",
      required: true,
    },
    templateName: { type: String, required: true },
    templateLanguage: { type: String, required: true },
    templateCategory: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(WHATSAPP_CAMPAIGN_STATUS),
      default: WHATSAPP_CAMPAIGN_STATUS.DRAFT,
      index: true,
    },
    audience: {
      mode: {
        type: String,
        enum: ["contacts", "filters", "all"],
        default: "contacts",
      },
      contactIds: { type: [String], default: [] },
      filters: { type: Schema.Types.Mixed, default: {} },
    },
    excludeOptedOut: { type: Boolean, default: true },
    timezone: { type: String, default: "UTC" },
    scheduledAt: Date,
    queuedAt: Date,
    startedAt: Date,
    completedAt: Date,
    pausedAt: Date,
    canceledAt: Date,
    resendOf: { type: Schema.Types.ObjectId, ref: "WhatsAppCampaign" },
    audienceCount: { type: Number, default: 0 },
    eligibleCount: { type: Number, default: 0 },
    excludedCount: { type: Number, default: 0 },
    totalRecipients: { type: Number, default: 0 },
    sentCount: { type: Number, default: 0 },
    deliveredCount: { type: Number, default: 0 },
    readCount: { type: Number, default: 0 },
    repliedCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    optedOutCount: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
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

schema.index({ accountId: 1, status: 1, createdAt: -1 });
schema.index({ organizationId: 1, scheduledAt: 1, status: 1 });

export const WhatsAppCampaignModel = model<WhatsAppCampaign>(
  "WhatsAppCampaign",
  schema,
);
