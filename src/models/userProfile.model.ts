import mongoose, { Schema } from "mongoose";
import { TUserProfile } from "../types";

const userProfileSchema = new Schema<TUserProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    firstName: { type: String },
    lastName: { type: String },
    organizationName: { type: String },
    accountType: { type: String, default: "individual" },
  },
  { timestamps: true }
);

export const UserProfileModel = mongoose.model<TUserProfile>(
  "UserProfile",
  userProfileSchema
);
