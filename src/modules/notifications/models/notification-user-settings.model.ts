import { model, Schema } from "mongoose";

const QuietHoursSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    start: { type: String, default: "22:00" },
    end: { type: String, default: "08:00" },
    timezone: { type: String, default: "Asia/Kolkata" },
  },
  { _id: false },
);

const NotificationUserSettingsSchema = new Schema(
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
    inAppEnabled: { type: Boolean, default: true },
    emailEnabled: { type: Boolean, default: true },
    emailMode: {
      type: String,
      enum: ["instant", "hourly", "daily"],
      default: "instant",
    },
    quietHours: { type: QuietHoursSchema, default: () => ({}) },
    timezone: { type: String, default: "Asia/Kolkata" },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "notification_user_settings",
  },
);

NotificationUserSettingsSchema.index(
  { organizationId: 1, userId: 1 },
  { unique: true },
);

export const NotificationUserSettingsModel = model(
  "NotificationUserSettings",
  NotificationUserSettingsSchema,
);
