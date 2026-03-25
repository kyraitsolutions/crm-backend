import { Document, Schema, model } from "mongoose";
import { TUser } from "../types";

export type TUserDocument = TUser & Document;

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String },
    googleId: { type: String, unique: true, sparse: true },
    profilePicture: { type: String },
    roleId: { type: Schema.Types.ObjectId, ref: "Role" },
    onboarding: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const UserModel = model<TUser>("User", userSchema);

export const RoleModel = model("Role", new Schema({ name: String }));
