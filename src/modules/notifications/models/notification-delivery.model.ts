import { model, Schema } from "mongoose";

const NotificationDeliverySchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    notificationId: {
      type: Schema.Types.ObjectId,
      ref: "Notification",
      default: null,
      index: true,
    },
    recipientUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    eventKey: { type: String, required: true, index: true },
    channel: {
      type: String,
      enum: ["in_app", "email"],
      required: true,
    },
    status: {
      type: String,
      enum: ["sent", "failed", "skipped", "queued"],
      required: true,
      index: true,
    },
    skipReason: { type: String, default: null },
    error: { type: String, default: null },
    attempts: { type: Number, default: 0 },
    dedupeKey: { type: String, default: null, index: true },
    meta: { type: Schema.Types.Mixed, default: {} },
    sentAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "notification_deliveries",
  },
);

NotificationDeliverySchema.index({
  organizationId: 1,
  recipientUserId: 1,
  createdAt: -1,
});
NotificationDeliverySchema.index({
  organizationId: 1,
  eventKey: 1,
  createdAt: -1,
});

export const NotificationDeliveryModel = model(
  "NotificationDelivery",
  NotificationDeliverySchema,
);
