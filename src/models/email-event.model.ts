import { Document, Schema, Types, model } from "mongoose";
import { EMAIL_EVENT_TYPE } from "../constants/email-marketing.constant.js";

export interface EmailEvent extends Document {
  organizationId: Types.ObjectId;
  accountId: Types.ObjectId;
  campaignId: Types.ObjectId;
  recipientId?: Types.ObjectId;
  leadId?: Types.ObjectId;
  email?: string;
  eventType: string;
  providerEventId?: string;
  url?: string;
  metadata?: Record<string, unknown>;
  occurredAt: Date;
  createdAt: Date;
}

const schema = new Schema<EmailEvent>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "EmailCampaign",
      required: true,
      index: true,
    },
    recipientId: { type: Schema.Types.ObjectId, ref: "EmailCampaignRecipient" },
    leadId: { type: Schema.Types.ObjectId, ref: "Lead" },
    email: { type: String, lowercase: true, trim: true },
    eventType: {
      type: String,
      enum: Object.values(EMAIL_EVENT_TYPE),
      required: true,
      index: true,
    },
    providerEventId: { type: String, sparse: true },
    url: String,
    metadata: { type: Schema.Types.Mixed, default: {} },
    occurredAt: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
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

schema.index(
  { providerEventId: 1 },
  { unique: true, sparse: true, partialFilterExpression: { providerEventId: { $type: "string" } } },
);
schema.index({ campaignId: 1, eventType: 1, occurredAt: 1 });
schema.index({ leadId: 1, createdAt: -1 });

export const EmailEventModel = model<EmailEvent>("EmailEvent", schema);
