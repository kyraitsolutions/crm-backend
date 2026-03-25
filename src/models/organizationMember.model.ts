import { Schema, model } from "mongoose";

const organizationMembershipSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    accountId: {
      type: Schema.Types.ObjectId,
      ref: "Account",
    },

    role: {
      type: String,
      enum: ["ADMIN", "ACCOUNT_MANAGER", "MEMBER"],
      default: "MEMBER",
    },

    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    isActive: {
      type: Boolean,
      default: true,
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

organizationMembershipSchema.index(
  { userId: 1, organizationId: 1, accountId: 1 },
  { unique: true },
);

export const OrganizationMember = model(
  "OrganizationMember",
  organizationMembershipSchema,
);
