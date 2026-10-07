import { model, Schema } from "mongoose";

const ChannelPolicySchema = new Schema(
  {
    channel: {
      type: String,
      enum: ["in_app", "email"],
      required: true,
    },
    locked: { type: Boolean, default: false },
    forcedEnabled: { type: Boolean, default: null },
    disabled: { type: Boolean, default: false },
  },
  { _id: false },
);

const NotificationWorkspacePolicySchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      unique: true,
      index: true,
    },
    channels: { type: [ChannelPolicySchema], default: [] },
    lockedEventKeys: { type: [String], default: [] },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "notification_workspace_policies",
  },
);

export const NotificationWorkspacePolicyModel = model(
  "NotificationWorkspacePolicy",
  NotificationWorkspacePolicySchema,
);
