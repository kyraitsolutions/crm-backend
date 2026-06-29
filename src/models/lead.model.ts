import { Document, model, Schema } from "mongoose";

export interface LeadNote {
  activitySource: "phone_call" | "message" | "note" | "email" | "whatsapp";
  attachment: string;
  message: string;
  createdBy?: Schema.Types.ObjectId | string;
  createdAt: Date;
}

export interface Lead extends Document {
  userId?: Schema.Types.ObjectId | string;
  accountId: Schema.Types.ObjectId | string;
  name: string;
  email: string;
  phone: string;
  mobile: string;
  message: string;
  description: string;
  company: string;
  title: string;
  website: string;
  customFields: Record<string, any>;

  stage: string;
  status: "active" | "inactive" | "pending";

  source: {
    name: {
      type: String;
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
      ];
    };
    url?: string;
    formId?: string;
    chatbotId?: string;
  };

  assignedTo?: string;
  tags?: string[];
  notes: LeadNote[];
  attachments: string[];

  meta: {
    ip: string;
    userAgent: string;
    location: {
      address: string;
      country: string;
      city: string;
      coordinates: {
        lat: number | null;
        lng: number | null;
      };
    };
  };

  isDeleted?: boolean;
  deletedAt?: Date;
  deletedBy?: Schema.Types.ObjectId | string;

  createdAt: Date;
  updatedAt: Date;
}

const leadNoteSchema = new Schema(
  {
    activitySource: {
      type: String,
      enum: ["phone_call", "message", "note", "email", "whatsapp"],
      default: "note",
    },
    attachment: String,
    message: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: true,
    id: false,
    toJSON: {
      transform(_, ret) {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  },
);

const leadSchema = new Schema<Lead>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true },

    // ✅ All string fields default to "" so they always exist in DB
    name: { type: String, default: "" },
    email: { type: String, lowercase: true, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    mobile: { type: String, trim: true, default: "" },
    message: { type: String, default: "" },
    description: { type: String, default: "" },
    company: { type: String, default: "" },
    title: { type: String, default: "" },
    website: { type: String, default: "" },
    customFields: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
    stage: {
      type: String,
      default: "new",
    },
    status: {
      type: String,
      enum: ["active", "inactive", "pending"],
      default: "active",
      set: (v: string) => v?.toLowerCase(),
    },
    source: {
      // ✅ required removed — handled by DTO default ("manual")
      // ✅ enum expanded to match all sources used across the app
      name: {
        type: String,
        enum: [
          "website",
          "google_ads",
          "facebook",
          "webform",
          "manual",
          "webhook",
          "import",
          "whatsapp",
          "instagram",
        ],
        default: "manual",
        set: (v: string) => v?.toLowerCase(),
      },
      url: { type: String, default: "" },
      // ✅ formId / chatbotId stored as plain String, not ObjectId ref
      //    so empty string "" is valid and won't throw CastError
      formId: { type: String, default: "" },
      chatbotId: { type: String, default: "" },
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    tags: [{ type: String }],
    notes: [leadNoteSchema],
    meta: {
      ip: { type: String, default: "" },
      userAgent: { type: String, default: "" },
      location: {
        address: { type: String, default: "" },
        country: { type: String, default: "" },
        city: { type: String, default: "" },
        coordinates: {
          // ✅ null is valid — use Mixed instead of Number
          lat: { type: Schema.Types.Mixed, default: null },
          lng: { type: Schema.Types.Mixed, default: null },
        },
      },
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
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

leadSchema.index({ accountId: 1 });
leadSchema.index({ userId: 1 });
leadSchema.index({ accountId: 1, stage: 1, status: 1 });
leadSchema.index({ email: 1 });
leadSchema.index({ phone: 1 });
leadSchema.index({ name: 1 });
leadSchema.index({ stage: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ "source.name": 1 });
leadSchema.index({ "source.formId": 1 });
leadSchema.index({ "source.chatbotId": 1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ tags: 1 });
leadSchema.index({ company: 1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ updatedAt: -1 });
leadSchema.index({
  name: "text",
  email: "text",
  phone: "text",
  company: "text",
});

export const LeadModel = model<Lead>("Lead", leadSchema);
