import { model, Schema } from "mongoose";

const PreferenceFiltersSchema = new Schema(
  {
    sources: { type: [String], default: undefined },
    assigned_to_me: { type: Boolean, default: undefined },
    unassigned_only: { type: Boolean, default: undefined },
    min_lead_score: { type: Number, default: undefined },
  },
  { _id: false },
);

const NotificationPreferenceSchema = new Schema(
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
    eventKey: { type: String, required: true, index: true },
    channel: {
      type: String,
      enum: ["in_app", "email"],
      required: true,
    },
    enabled: { type: Boolean, default: true },
    filters: { type: PreferenceFiltersSchema, default: () => ({}) },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "notification_preferences",
  },
);

NotificationPreferenceSchema.index(
  { organizationId: 1, userId: 1, eventKey: 1, channel: 1 },
  { unique: true },
);

export const NotificationPreferenceModel = model(
  "NotificationPreference",
  NotificationPreferenceSchema,
);
