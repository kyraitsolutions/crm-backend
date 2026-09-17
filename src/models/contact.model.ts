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
    source?: "chatbot" |"website"| "webform" | "manual" | "google_ads" | "import"|"instagram"|"whatsapp"|"facebook"|"webhook";
    timestamp?: Date;
  };

  whatsapp: {
    optIn: boolean;
    optedInAt?: Date;
    optedOutAt?: Date;
    source?: string;
  };

  // Metadata
  source: "chatbot" | "website"|"webform" | "google_ads" | "manual" | "import" |"instagram"|"whatsapp"|"facebook"|"webhook";

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
        enum: [
          "chatbot",
          "website",
          "webform",
          "google_ads",
          "manual",
          "import",
          "instagram",
          "whatsapp",
          "facebook",
          "webhook",
        ],
      },
      timestamp: Date,
    },

    whatsapp: {
      optIn: { type: Boolean, default: true, index: true },
      optedInAt: Date,
      optedOutAt: Date,
      source: { type: String, default: "" },
    },

    source: {
      type: String,
      enum: [
        "chatbot",
        "website",
        "webform",
        "google_ads",
        "manual",
        "import",
        "instagram",
        "whatsapp",
        "facebook",
        "webhook",
      ],
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

// Compound unique+sparse indexes still include docs that only have accountId.
// Contacts without email then share { accountId, email: null } and the second
// WhatsApp contact in an account fails with E11000. Partial filters keep
// uniqueness only when email/phone actually exist.
contactSchema.index(
  { accountId: 1, email: 1 },
  {
    unique: true,
    name: "uniq_account_email",
    collation: { locale: "en", strength: 2 },
    partialFilterExpression: {
      email: { $type: "string", $gt: "" },
    },
  },
);

contactSchema.index(
  { accountId: 1, phone: 1 },
  {
    unique: true,
    name: "uniq_account_phone",
    partialFilterExpression: {
      phone: { $type: "string", $gt: "" },
    },
  },
);

export const ContactModel = model<Contact>("Contact", contactSchema);
