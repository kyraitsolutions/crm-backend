import { Schema, model } from "mongoose";

const VariableMappingSchema = new Schema(
  {
    variable: {
      type: String,
      required: true,
    },

    component: {
      type: String,
      enum: ["HEADER", "BODY", "BUTTON"],
      required: true,
    },

    sourceType: {
      type: String,
      enum: ["CONTACT", "BOOKING", "CUSTOM", "STATIC", "API"],
      default: "CUSTOM",
    },

    sourceKey: {
      type: String,
      default: null,
    },

    fallbackValue: {
      type: String,
      default: "",
    },
  },
  {
    _id: false,
  },
);

const WhatsappTemplateSchema = new Schema(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },

    wabaId: {
      type: String,
      required: true,
    },

    phoneNumberId: {
      type: String,
      required: true,
    },

    metaTemplateId: {
      type: String,
      default: null,
    },

    name: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    language: {
      type: String,
      required: true,
    },

    category: {
      type: String,
      enum: ["MARKETING", "UTILITY", "AUTHENTICATION"],
      required: true,
    },

    parameterFormat: {
      type: String,
      enum: ["NAMED", "POSITIONAL"],
      default: "NAMED",
    },

    status: {
      type: String,
      enum: ["DRAFT", "PENDING", "APPROVED", "REJECTED", "PAUSED", "DISABLED"],
      default: "DRAFT",
    },

    components: {
      type: [Schema.Types.Mixed],
      required: true,
    },

    variableMappings: {
      type: [VariableMappingSchema],
      default: [],
    },

    submittedAt: Date,

    approvedAt: Date,

    rejectedReason: String,
  },
  {
    timestamps: true,
  },
);

WhatsappTemplateSchema.index({
  ndid: 1,
  hid: 1,
  name: 1,
});

export const WhatsappTemplateModel = model(
  "WhatsappTemplate",
  WhatsappTemplateSchema,
);
