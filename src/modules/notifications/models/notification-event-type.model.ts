import { model, Schema } from "mongoose";

const NotificationEventTypeSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    module: { type: String, required: true, index: true },
    label: { type: String, required: true },
    description: { type: String, default: "" },
    defaultChannels: { type: [String], default: ["in_app"] },
    critical: { type: Boolean, default: false },
    supportedSources: { type: [String], default: [] },
    supportedFilters: { type: [String], default: [] },
    recipientStrategy: { type: String, required: true },
    groupable: { type: Boolean, default: false },
    legacyBucket: { type: String, default: null },
    active: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "notification_event_types",
  },
);

export const NotificationEventTypeModel = model(
  "NotificationEventType",
  NotificationEventTypeSchema,
);
