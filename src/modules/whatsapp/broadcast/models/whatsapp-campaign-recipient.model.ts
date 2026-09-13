import { Document, Schema, Types, model } from "mongoose";
import { WHATSAPP_RECIPIENT_STATUS } from "../constants/broadcast.constant.js";

export interface WhatsAppCampaignRecipient extends Document {
  organizationId: Types.ObjectId;
  accountId: Types.ObjectId;
  campaignId: Types.ObjectId;
  contactId?: Types.ObjectId;
  phone: string;
  name?: string;
  status: string;
  providerMessageId?: string;
  idempotencyKey: string;
  error?: string;
  queuedAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failedAt?: Date;
  repliedAt?: Date;
  optedOutAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<WhatsAppCampaignRecipient>(
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
      ref: "WhatsAppCampaign",
      required: true,
      index: true,
    },
    contactId: { type: Schema.Types.ObjectId, ref: "Contact", index: true },
    phone: { type: String, required: true, trim: true },
    name: { type: String, default: "" },
    status: {
      type: String,
      enum: Object.values(WHATSAPP_RECIPIENT_STATUS),
      default: WHATSAPP_RECIPIENT_STATUS.PENDING,
      index: true,
    },
    providerMessageId: { type: String, index: true, sparse: true },
    idempotencyKey: { type: String, required: true },
    error: String,
    queuedAt: Date,
    sentAt: Date,
    deliveredAt: Date,
    readAt: Date,
    failedAt: Date,
    repliedAt: Date,
    optedOutAt: Date,
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

schema.index({ campaignId: 1, phone: 1 }, { unique: true });
schema.index({ campaignId: 1, status: 1 });
schema.index({ idempotencyKey: 1 }, { unique: true });
schema.index({ providerMessageId: 1 }, { sparse: true });

export const WhatsAppCampaignRecipientModel = model<WhatsAppCampaignRecipient>(
  "WhatsAppCampaignRecipient",
  schema,
);
