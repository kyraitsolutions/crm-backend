import { Document, Schema, model, Types } from "mongoose";

export interface SubscriptionAddonDocument extends Document {
  subscriptionId: Types.ObjectId;
  organizationId: Types.ObjectId;
  addonCode: string;
  status: "active" | "canceled" | "expired";
  price?: number;
  currency?: string;
  startedAt: Date;
  endedAt?: Date;
}

const subscriptionAddonSchema = new Schema(
  {
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "OrganizationSubscription",
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    addonCode: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["active", "canceled", "expired"],
      default: "active",
    },
    price: { type: Number },
    currency: { type: String, default: "INR" },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

subscriptionAddonSchema.index({ organizationId: 1, addonCode: 1, status: 1 });

export const SubscriptionAddon = model<SubscriptionAddonDocument>(
  "SubscriptionAddon",
  subscriptionAddonSchema,
);
