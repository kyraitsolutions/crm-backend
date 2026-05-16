import { Schema, model, Types } from "mongoose";

export interface Contact {
  accountId: Types.ObjectId;

  // Identity
  email: string;
  name?: string;
  phone?: string;

  // Lifecycle
  status: "subscribed" | "unsubscribed" | "bounced";

  // Consent & compliance
  consent: {
    marketing: boolean;
    source?: "chatbot" |"website"| "webform" | "manual" | "google_ads" | "import"|"instagram"|"whatsapp"|"facebook";
    timestamp?: Date;
  };

  // Metadata
  source: "chatbot" | "website"|"webform" | "google_ads" | "manual" | "import" |"instagram"|"whatsapp"|"facebook";

  // Segmentation
  tags: string[];

  // System
  createdAt: Date;
  updatedAt: Date;
  lastActivity: Date;
}

const contactSchema = new Schema<Contact>(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
    },

    name: { type: String, trim: true },
    phone: { type: String, trim: true },

    status: {
      type: String,
      enum: ["subscribed", "unsubscribed", "bounced"],
      default: "subscribed",
    },

    consent: {
      marketing: { type: Boolean, default: false },
      source: {
        type: String,
        enum: ["chatbot", "webform", "google_ads", "manual", "import","instagram","whatsapp","facebook"],
      },
      timestamp: Date,
    },

    source: {
      type: String,
      enum: ["chatbot", "webform", "google_ads", "manual", "import","instagram","whatsapp","facebook"],
    },

    tags: [{ type: String }],
    lastActivity: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  },
);

contactSchema.index(
  { accountId: 1, email: 1 },
  {
    unique: true,
    collation: { locale: "en", strength: 2 },
  },
);

export const ContactModel = model<Contact>("Contact", contactSchema);
