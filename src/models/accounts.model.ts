import mongoose, { model } from "mongoose";
const accountSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    accountName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_, ret) {
        delete (ret as any).__v;
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  },
);

// Indexes for better performance
accountSchema.index({ userId: 1 });
accountSchema.index({ email: 1 });
accountSchema.index({ accountName: 1 });
accountSchema.index({ status: 1 });
accountSchema.index({ createdAt: -1 });

export const AccountModel = model("Account", accountSchema);
