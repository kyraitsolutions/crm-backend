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
        const row = ret as { id?: unknown; _id?: unknown; __v?: unknown };
        row.id = row._id;
        delete row._id;
        delete row.__v;
        return row;
      },
    },
  },
);

export const PermissionModel = mongoose.model("Permission", permissionSchema);
