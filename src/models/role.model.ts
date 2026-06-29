import mongoose, { Schema } from "mongoose";

const RoleSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    isSystemRole: {
      type: Boolean,
      default: false,
    },

    level: {
      type: Number,
      required: true,
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

RoleSchema.index({ name: 1, organizationId: 1 }, { unique: true });

// delete mongoose.models.Role;
// export const RoleModel = mongoose.model("Role", RoleSchema);
export const RoleModel =
  mongoose.models.Role || mongoose.model("Role", RoleSchema);
