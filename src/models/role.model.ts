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
        const row = ret as { id?: unknown; _id?: unknown; __v?: unknown };
        row.id = row._id;
        delete row._id;
        delete row.__v;
        return row;
      },
    },
  },
);

RoleSchema.index({ name: 1, organizationId: 1 }, { unique: true });

// delete mongoose.models.Role;
// export const RoleModel = mongoose.model("Role", RoleSchema);
export const RoleModel =
  mongoose.models.Role || mongoose.model("Role", RoleSchema);
