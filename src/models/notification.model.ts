import { Document, model, Schema } from "mongoose";

export interface Notification extends Document {
  organizationId: Schema.Types.ObjectId;
  accountId: Schema.Types.ObjectId;
  title: string;
  description: string;
  typeId: string;
  type: "new_lead" | "message" | "chatbot" | "system_alert" | "communication";

  channelType:
    | "chatbot"
    | "website"
    | "google_ads"
    | "whatsapp"
    | "facebook"
    | "instagram"
    | "webform"
    | "manual"
    | "webhook";
  isPriority: boolean;
  isRead: boolean;
  readAt?: Date;
  meta?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
const notificationSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    title: String,
    description: String,

    typeId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["new_lead", "message", "chatbot", "system_alert", "communication"],
      required: true,
    },

    channelType: {
      type: String,
      enum: [
        "chatbot",
        "website",
        "google_ads",
        "whatsapp",
        "facebook",
        "instagram",
        "webform",
        "manual",
        "webhook",
      ],
    },
    isPriority: {
      type: Boolean,
      default: false,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    unreadCount: {
      type: Number,
      default: 1,
    },
    readAt: Date,

    meta: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_, ret) {
        const row = ret as { id?: unknown; _id?: unknown; __v?: unknown };
        row.id = row._id;
        delete row._id;
        delete row.__v;
        return row;
      },
    },
  },
);

notificationSchema.index({ organizationId: 1, accountId: 1, createdAt: -1 });
notificationSchema.index({ organizationId: 1, accountId: 1, isRead: 1 });
notificationSchema.index({ organizationId: 1, accountId: 1, type: 1 });
notificationSchema.index({ organizationId: 1, accountId: 1, channelType: 1 });
export const Notification = model("Notification", notificationSchema);
