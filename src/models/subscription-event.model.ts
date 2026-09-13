import { Document, Schema, model, Types } from "mongoose";

export interface SubscriptionEventDocument extends Document {
  subscriptionId?: Types.ObjectId;
  organizationId: Types.ObjectId;
  eventType: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const subscriptionEventSchema = new Schema(
  {
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "OrganizationSubscription",
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    eventType: { type: String, required: true, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

export const SubscriptionEvent = model<SubscriptionEventDocument>(
  "SubscriptionEvent",
  subscriptionEventSchema,
);
