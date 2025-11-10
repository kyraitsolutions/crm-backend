import mongoose, { Schema } from "mongoose";

const userProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    firstName: { type: String },
    lastName: { type: String },
    organizationName: { type: String },
    accountType: { type: String, default: "organization" },
  },
  { timestamps: true }
);

export const UserProfileModel = mongoose.model(
  "UserProfile",
  userProfileSchema
);
