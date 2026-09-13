import { Document, Schema, Types, model } from "mongoose";
import { EMAIL_RECIPIENT_STATUS } from "../constants/email-marketing.constant.js";

export interface EmailCampaignRecipient extends Document {
  organizationId: Types.ObjectId;
  accountId: Types.ObjectId;
  campaignId: Types.ObjectId;
  contactId?: Types.ObjectId;
  leadId?: Types.ObjectId;
  email: string;
  name?: string;
  status: string;
  providerMessageId?: string;
  idempotencyKey: string;
  clickCount: number;
  lastClickedUrl?: string;
  error?: string;
  queuedAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  bouncedAt?: Date;
  unsubscribedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<EmailCampaignRecipient>(
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
    },
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "EmailCampaign",
      required: true,
      index: true,
    },
    contactId: { type: Schema.Types.ObjectId, ref: "Contact", index: true },
    leadId: { type: Schema.Types.ObjectId, ref: "Lead", index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, default: "" },
    status: {
      type: String,
      enum: Object.values(EMAIL_RECIPIENT_STATUS),
      default: EMAIL_RECIPIENT_STATUS.PENDING,
      index: true,
    },
    providerMessageId: { type: String, index: true, sparse: true },
    idempotencyKey: { type: String, required: true },
    clickCount: { type: Number, default: 0 },
    lastClickedUrl: String,
    error: String,
    queuedAt: Date,
    sentAt: Date,
    deliveredAt: Date,
    openedAt: Date,
    clickedAt: Date,
    bouncedAt: Date,
    unsubscribedAt: Date,
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

schema.index({ campaignId: 1, email: 1 }, { unique: true });
schema.index({ campaignId: 1, status: 1 });
schema.index({ idempotencyKey: 1 }, { unique: true });
schema.index({ organizationId: 1, email: 1 });

export const EmailCampaignRecipientModel = model<EmailCampaignRecipient>(
  "EmailCampaignRecipient",
  schema,
);
