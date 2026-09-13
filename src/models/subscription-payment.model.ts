import { Document, Schema, model, Types } from "mongoose";

export type SubscriptionPaymentStatus =
  | "pending"
  | "captured"
  | "failed"
  | "refunded";

export interface SubscriptionPaymentDocument extends Document {
  organizationId: Types.ObjectId;
  subscriptionId?: Types.ObjectId;
  planId?: Types.ObjectId;
  planCode?: string;
  planName?: string;
  interval?: "monthly" | "yearly";
  amount: number;
  amountPaise: number;
  currency: string;
  status: SubscriptionPaymentStatus;
  provider: string;
  source: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  method?: string;
  failureReason?: string;
  paidAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionPaymentSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "OrganizationSubscription",
      index: true,
    },
    planId: { type: Schema.Types.ObjectId, ref: "Plan" },
    planCode: { type: String, index: true },
    planName: { type: String },
    interval: { type: String, enum: ["monthly", "yearly"] },
    amount: { type: Number, required: true, default: 0 },
    amountPaise: { type: Number, required: true, default: 0 },
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      enum: ["pending", "captured", "failed", "refunded"],
      default: "pending",
      index: true,
    },
    provider: { type: String, default: "razorpay" },
    source: { type: String, default: "checkout" },
    razorpayOrderId: { type: String, index: true },
    razorpayPaymentId: { type: String, index: true, sparse: true },
    method: { type: String },
    failureReason: { type: String },
    paidAt: { type: Date, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, versionKey: false },
);

subscriptionPaymentSchema.index({ razorpayOrderId: 1 }, { unique: true, sparse: true });
subscriptionPaymentSchema.index(
  { razorpayPaymentId: 1 },
  { unique: true, sparse: true },
);
subscriptionPaymentSchema.index({ organizationId: 1, createdAt: -1 });
subscriptionPaymentSchema.index({ status: 1, paidAt: -1 });

export const SubscriptionPayment = model<SubscriptionPaymentDocument>(
  "SubscriptionPayment",
  subscriptionPaymentSchema,
);
