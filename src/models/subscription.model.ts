import { Document, Schema, model } from "mongoose";

export type PlanName = string;

export interface PlanDocument extends Document {
  code: string;
  name: string;
  description: string;
  featured: boolean;
  isActive: boolean;
  isPublic: boolean;
  isTrial: boolean;
  trialDays: number;
  currency: string;
  price: { monthly: number; annually: number };
  period: string;
  durationDays: number;
  button: string;
  maxAccounts: number;
  maxChatbots: number;
  maxWebforms: number;
  features: string[];
  addons: string[];
  featureMap: Record<string, boolean>;
  limits: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

export type UserSubscriptionStatus = "active" | "expired";

export interface UserSubscriptionDocument extends Document {
  userId: Schema.Types.ObjectId;
  planId: Schema.Types.ObjectId;
  status: UserSubscriptionStatus;
  startedAt: Date;
  expiresAt: Date;
  credits: number;
  createdAt: Date;
  updatedAt: Date;
}

const planSchema = new Schema(
  {
    code: { type: String, unique: true, sparse: true, index: true },
    name: {
      type: String,
      required: true,
      unique: true,
    },
    maxAccounts: { type: Number, default: 1 },
    maxChatbots: { type: Number, default: 1 },
    maxWebforms: { type: Number, default: 1 },
    description: { type: String, default: "" },
    featured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isPublic: { type: Boolean, default: true },
    isTrial: { type: Boolean, default: false },
    trialDays: { type: Number, default: 0 },
    currency: { type: String, default: "INR" },
    price: {
      monthly: { type: Number, default: 0 },
      annually: { type: Number, default: 0 },
    },
    period: { type: String, default: "month" },
    durationDays: { type: Number, default: 30 },
    button: { type: String },
    features: [{ type: String }],
    addons: [{ type: String }],
    featureMap: { type: Schema.Types.Mixed, default: {} },
    limits: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_, ret) {
        delete (ret as any).__v;
        return ret;
      },
    },
  },
);

const userSubscriptionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "expired"],
      default: "active",
    },
    startedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    credits: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_: any, ret: any) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

userSubscriptionSchema.index({ userId: 1 });
userSubscriptionSchema.index({ planId: 1 });

export const Plan = model<PlanDocument>("Plan", planSchema);
export const UserSubscription = model<UserSubscriptionDocument>(
  "UserSubscription",
  userSubscriptionSchema,
);
