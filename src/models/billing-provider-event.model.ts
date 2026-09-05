import { Document, Schema, model } from "mongoose";

export interface BillingProviderEventDocument extends Document {
  provider: string;
  eventId: string;
  eventType: string;
  processedAt: Date;
  payload?: Record<string, unknown>;
}

const billingProviderEventSchema = new Schema(
  {
    provider: { type: String, required: true, default: "razorpay" },
    eventId: { type: String, required: true, unique: true },
    eventType: { type: String, required: true },
    processedAt: { type: Date, default: Date.now },
    payload: { type: Schema.Types.Mixed },
  },
  { timestamps: true, versionKey: false },
);

export const BillingProviderEvent = model<BillingProviderEventDocument>(
  "BillingProviderEvent",
  billingProviderEventSchema,
);
