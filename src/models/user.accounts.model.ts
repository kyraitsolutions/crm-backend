import { Schema, model, Types } from "mongoose";

const userAccountSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    accountId: {
      type: Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },
    organizationId: {
      type: Types.ObjectId,
      ref: "Organization",
    },
    roleId: {
      type: Types.ObjectId,
      ref: "Role",
    },
  },
  { timestamps: true },
);

// prevent duplicate assignment
userAccountSchema.index({ userId: 1, accountId: 1 });

export const UserAccount = model("UserAccount", userAccountSchema);
