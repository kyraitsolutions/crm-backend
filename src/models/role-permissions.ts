import mongoose, { Model, Schema } from "mongoose";
import { TRolePermission } from "../types/roles-permissions.type.js";

const RolePermissionSchema = new Schema(
  {
    roleId: {
      type: Schema.Types.ObjectId,
      ref: "Role",
      required: true,
      index: true,
    },

    permissionId: {
      type: Schema.Types.ObjectId,
      ref: "Permission",
      required: true,
      index: true,
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

RolePermissionSchema.index({ roleId: 1, permissionId: 1 }, { unique: true });

export const RolePermissionModel: Model<TRolePermission> =
  mongoose.models.RolePermission ||
  mongoose.model<TRolePermission>("RolePermission", RolePermissionSchema);
