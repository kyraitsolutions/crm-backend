import { Schema, model } from "mongoose";

const planSchema = new Schema(
  {
    name: {
      type: String, 
      enum: ["free", "gold", "platinum", "payg"],
      default:"free",
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
      transform(_, ret) {
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

userSubscriptionSchema.index({ userId: 1 });
userSubscriptionSchema.index({ planId: 1 });


export const Plan = model("Plan", planSchema);
export const UserSubscription = model("UserSubscription", userSubscriptionSchema);


