import { Schema, model, Types } from "mongoose";
import { TemplateCategory } from "../enums/email.enum.js";

export interface EmailTemplate {
  accountId: Types.ObjectId;
  name: string;
  subject: string;
  preheader?: string;

  // Content
  html: string;
  text?: string;
  design?: any; // editor JSON (MJML / Unlayer / custom builder)

  variables?: string[];
  thumbnail?: string;
  // Metadata
  category?: TemplateCategory; // marketing, transactional, follow-up
  tags?: string[];

  // AI support
  generatedBy?: "ai" | "user";
  aiPrompt?: string;

  // Versioning & status
  status: "draft" | "active" | "archived";
  version: number;

  createdBy?: Types.ObjectId;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
const EmailTemplateSchema = new Schema<EmailTemplate>(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
    },

    preheader: {
      type: String,
      trim: true,
    },

    html: {
      type: String,
      required: true,
    },

    text: {
      type: String,
    },

    variables: [
      {
        type: String,
        trim: true,
      },
    ],
    thumbnail: {
      type: String,
      trim: true,
    },
    design: {
      type: Schema.Types.Mixed, // Email builder JSON
    },

    category: {
      type: String,
      enum: Object.values(TemplateCategory),
      default: "marketing",
    },

    tags: [{ type: String }],

    generatedBy: {
      type: String,
      enum: ["ai", "user"],
      default: "user",
    },

    aiPrompt: {
      type: String,
    },

    status: {
      type: String,
      enum: ["draft", "active", "archived"],
      default: "draft",
      index: true,
    },

    version: {
      type: Number,
      default: 1,
    },

    lastUsedAt: {
      type: Date,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_, ret) {
        delete (ret as any).__v;
        return ret;
      },
    },
  },
);

EmailTemplateSchema.index({ accountId: 1, name: 1 }, { unique: true });

export const EmailTemplateModel = model<EmailTemplate>(
  "EmailTemplate",
  EmailTemplateSchema,
);
