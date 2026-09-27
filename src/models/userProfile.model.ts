import mongoose, { Schema } from "mongoose";

const userProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    firstName: { type: String },
    lastName: { type: String },
    profilePicture: { type: String },
    phone: { type: String },
    address: {
      city: { type: String },
      state: { type: String },
      country: { type: String },
      pincode: { type: String },
      addressLine1: { type: String },
      addressLine2: { type: String },
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_, ret) {
        const row = ret as { id?: unknown; _id?: unknown; __v?: unknown };
        row.id = row._id;
        delete row._id;
        delete row.__v;
        return row;
      },
    },
  },
);

export const UserProfileModel = mongoose.model(
  "UserProfile",
  userProfileSchema,
);
