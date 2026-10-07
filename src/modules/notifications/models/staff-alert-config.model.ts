import { model, Schema } from "mongoose";

const SourceTemplateSchema = new Schema(
  {
    source: { type: String, required: true },
    templateId: {
      type: Schema.Types.ObjectId,
      ref: "WhatsappTemplate",
      required: true,
    },
  },
  { _id: false },
);

const StaffAlertChannelsSchema = new Schema(
  {
    in_app: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
    whatsapp: { type: Boolean, default: false },
  },
  { _id: false },
);

const StaffAlertEventsSchema = new Schema(
  {
    lead_created: { type: Boolean, default: true },
  },
  { _id: false },
);

const StaffAlertWhatsAppSchema = new Schema(
  {
    defaultTemplateId: {
      type: Schema.Types.ObjectId,
      ref: "WhatsappTemplate",
      default: null,
    },
    bySource: { type: [SourceTemplateSchema], default: [] },
  },
  { _id: false },
);

const StaffAlertConfigSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      unique: true,
      index: true,
    },
    enabled: { type: Boolean, default: true },
    channels: {
      type: StaffAlertChannelsSchema,
      default: () => ({ in_app: true, email: true, whatsapp: false }),
    },
    /** Empty = all account members. */
    recipientUserIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    events: {
      type: StaffAlertEventsSchema,
      default: () => ({ lead_created: true }),
    },
    whatsapp: {
      type: StaffAlertWhatsAppSchema,
      default: () => ({ defaultTemplateId: null, bySource: [] }),
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "staff_alert_configs",
  },
);

export const StaffAlertConfigModel = model(
  "StaffAlertConfig",
  StaffAlertConfigSchema,
);
