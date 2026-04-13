import mongoose from "mongoose";

const permissionSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true, // VERY IMPORTANT
    },
    module: {
      type: String, // optional (accounts, leads, etc.)
    },
    action: {
      type: String, // optional (create, edit, etc.)
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (_, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  },
);

export const PermissionModel = mongoose.model("Permission", permissionSchema);
