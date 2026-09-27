import mongoose, { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String },
    googleId: { type: String, unique: true, sparse: true },
    profilePicture: { type: String },
    onboarding: { type: Boolean, default: false },
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

userSchema.virtual("profile", {
  ref: "UserProfile",
  localField: "_id",
  foreignField: "userId",
  justOne: true,
});

userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

export const UserModel = model("User", userSchema);

export const RoleModel =
  mongoose.models.Role || model("Role", new Schema({ name: String }));
