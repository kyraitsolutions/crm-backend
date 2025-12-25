import { Document, Schema, model } from "mongoose";

export type PlanName = "free" | "gold" | "platinum" | "payg";

export interface PlanDocument extends Document {
  name: PlanName;

  price: number;
  durationDays: number;

  maxAccounts: number;
  maxChatbots: number;
  maxWebforms: number;

  features: string[];

  createdAt: Date;
  updatedAt: Date;
}


export type SubscriptionStatus = "active" | "expired";

export interface UserSubscriptionDocument extends Document {
  userId: Schema.Types.ObjectId;
  planId: Schema.Types.ObjectId;

  status: SubscriptionStatus;

  startedAt: Date;
  expiresAt: Date;

  credits: number;

  createdAt: Date;
  updatedAt: Date;
}
const planSchema = new Schema(
  {
    name: {
      type: String,
      enum: ["free", "gold", "platinum", "payg"],
      default: "free",
      required: true,
      unique: true
    },

    price: { type: Number, default: 0 }, // ₹ or $
    durationDays: { type: Number, default: 30 }, // plan validity

    maxAccounts: { type: Number, default: 1 },
    maxChatbots: { type: Number, default: 1 },
    maxWebforms: { type: Number, default: 1 },

    features: [{ type: String }],
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
  }
);


const userSubscriptionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    planId: {
      type: Schema.Types.ObjectId,
      ref: "Plan",
      required: true
    },

    status: {
      type: String,
      enum: ["active", "expired"],
      default: "active"
    },

    startedAt: { type: Date, default: Date.now },

    expiresAt: { type: Date, required: true },

    // For Pay-as-you-go
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
  }
);

userSubscriptionSchema.index({ userId: 1 });
userSubscriptionSchema.index({ planId: 1 });


export const Plan = model<PlanDocument>("Plan", planSchema);
export const UserSubscription = model<UserSubscriptionDocument>("UserSubscription", userSubscriptionSchema);


