import { Schema, Types, model } from "mongoose";

export type EmailTrackingKind = "open" | "click" | "unsub";

export interface EmailTrackingLink {
  kind: EmailTrackingKind;
  campaignId: Types.ObjectId;
  recipientId: Types.ObjectId;
  url?: string;
  createdAt: Date;
}

const schema = new Schema<EmailTrackingLink>(
  {
    kind: { type: String, enum: ["open", "click", "unsub"], required: true, index: true },
    campaignId: { type: Schema.Types.ObjectId, ref: "EmailCampaign", required: true, index: true },
    recipientId: { type: Schema.Types.ObjectId, ref: "EmailCampaignRecipient", required: true },
    url: String,
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

export const EmailTrackingLinkModel = model<EmailTrackingLink>(
  "EmailTrackingLink",
  schema,
);
