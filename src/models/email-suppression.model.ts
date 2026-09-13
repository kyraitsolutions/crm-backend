import { Document, Schema, Types, model } from "mongoose";
import { EMAIL_SUPPRESSION_REASON } from "../constants/email-marketing.constant.js";

export interface EmailSuppression extends Document {
  organizationId: Types.ObjectId;
  accountId?: Types.ObjectId;
  email: string;
  reason: string;
  source?: string;
  campaignId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<EmailSuppression>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    accountId: { type: Schema.Types.ObjectId, ref: "Account" },
    email: { type: String, required: true, lowercase: true, trim: true },
    reason: {
      type: String,
      enum: Object.values(EMAIL_SUPPRESSION_REASON),
      required: true,
    },
    source: { type: String, default: "marketing" },
    campaignId: { type: Schema.Types.ObjectId, ref: "EmailCampaign" },
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

schema.index({ organizationId: 1, email: 1 }, { unique: true });
schema.index({ organizationId: 1, createdAt: -1 });

export const EmailSuppressionModel = model<EmailSuppression>(
  "EmailSuppression",
  schema,
);
