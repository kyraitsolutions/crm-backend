import { Document, Schema, model, Types } from "mongoose";
import { SUBSCRIPTION_STATUS } from "../constants/subscription.constant.js";

export interface OrganizationSubscriptionDocument extends Document {
  organizationId: Types.ObjectId;
  planId: Types.ObjectId;
  planCode: string;
  status: string;
  trialStartAt?: Date;
  trialEndAt?: Date;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  razorpayCustomerId?: string;
  razorpaySubscriptionId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  expirationPromptShownAt?: Date;
  expirationPromptDismissedAt?: Date;
  billingInterval?: "monthly" | "yearly";
  createdAt: Date;
  updatedAt: Date;
}

const organizationSubscriptionSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      unique: true,
      index: true,
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },
    planCode: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: Object.values(SUBSCRIPTION_STATUS),
      default: SUBSCRIPTION_STATUS.TRIALING,
      index: true,
    },
    trialStartAt: { type: Date },
    trialEndAt: { type: Date },
    currentPeriodStart: { type: Date, required: true },
    currentPeriodEnd: { type: Date, required: true },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    canceledAt: { type: Date },
    razorpayCustomerId: { type: String },
    razorpaySubscriptionId: { type: String },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    expirationPromptShownAt: { type: Date },
    expirationPromptDismissedAt: { type: Date },
    billingInterval: { type: String, enum: ["monthly", "yearly"] },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const OrganizationSubscription = model<OrganizationSubscriptionDocument>(
  "OrganizationSubscription",
  organizationSubscriptionSchema,
);
