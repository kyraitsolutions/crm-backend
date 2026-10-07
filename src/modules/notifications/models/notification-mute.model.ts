import { model, Schema } from "mongoose";

const NotificationMuteSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    entityType: { type: String, required: true, index: true },
    entityId: { type: String, required: true, index: true },
    until: { type: Date, default: null, index: true },
    reason: { type: String, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "notification_mutes",
  },
);

NotificationMuteSchema.index(
  { organizationId: 1, userId: 1, entityType: 1, entityId: 1 },
  { unique: true },
);

export const NotificationMuteModel = model(
  "NotificationMute",
  NotificationMuteSchema,
);
