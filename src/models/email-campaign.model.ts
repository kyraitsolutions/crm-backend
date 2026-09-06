import { Document, Schema, Types, model } from "mongoose";
import { EMAIL_CAMPAIGN_STATUS } from "../constants/email-marketing.constant.js";

export interface EmailCampaign extends Document {
  organizationId: Types.ObjectId;
  accountId: Types.ObjectId;
  name: string;
  subject: string;
  previewText?: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  html: string;
  text?: string;
  templateId?: Types.ObjectId;
  status: string;
  audience: {
    mode: "contacts" | "filters" | "all";
    contactIds: string[];
    filters: Record<string, unknown>;
  };
  timezone?: string;
  scheduledAt?: Date;
  queuedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  pausedAt?: Date;
  canceledAt?: Date;
  audienceCount: number;
  eligibleCount: number;
  excludedCount: number;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  bouncedCount: number;
  unsubscribedCount: number;
  complainedCount: number;
  failedCount: number;
  validation?: { errors: string[]; warnings: string[] };
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<EmailCampaign>(
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
    subject: { type: String, required: true, trim: true },
    previewText: { type: String, default: "" },
    fromName: { type: String, required: true, trim: true },
    fromEmail: { type: String, required: true, trim: true, lowercase: true },
    replyTo: { type: String, trim: true, lowercase: true },
    html: { type: String, required: true },
    text: { type: String, default: "" },
    templateId: { type: Schema.Types.ObjectId, ref: "EmailTemplate" },
    status: {
      type: String,
      enum: Object.values(EMAIL_CAMPAIGN_STATUS),
      default: EMAIL_CAMPAIGN_STATUS.DRAFT,
      index: true,
    },
    audience: {
      mode: { type: String, enum: ["contacts", "filters", "all", "leads"], default: "all" },
      contactIds: { type: [String], default: [] },
      leadIds: { type: [String], default: [] },
      filters: { type: Schema.Types.Mixed, default: {} },
    },
    timezone: { type: String, default: "UTC" },
    scheduledAt: Date,
    queuedAt: Date,
    startedAt: Date,
    completedAt: Date,
    pausedAt: Date,
    canceledAt: Date,
    audienceCount: { type: Number, default: 0 },
    eligibleCount: { type: Number, default: 0 },
    excludedCount: { type: Number, default: 0 },
    totalRecipients: { type: Number, default: 0 },
    sentCount: { type: Number, default: 0 },
    deliveredCount: { type: Number, default: 0 },
    openedCount: { type: Number, default: 0 },
    clickedCount: { type: Number, default: 0 },
    bouncedCount: { type: Number, default: 0 },
    unsubscribedCount: { type: Number, default: 0 },
    complainedCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    validation: {
      errors: { type: [String], default: [] },
      warnings: { type: [String], default: [] },
    },
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

schema.index({ organizationId: 1, createdAt: -1 });
schema.index({ accountId: 1, status: 1, createdAt: -1 });
schema.index({ organizationId: 1, scheduledAt: 1, status: 1 });

export const EmailCampaignModel = model<EmailCampaign>(
  "EmailCampaign",
  schema,
);
