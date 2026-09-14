import { Document, Schema, Types, model } from "mongoose";
import {
  AUTO_REPLY_TYPE,
  AUTO_RESOLVE_MODE,
  AUTO_RESOLVE_SCHEDULE,
  DEFAULT_OFF_HOURS_TEXT,
  DEFAULT_WELCOME_TEXT,
  DEFAULT_WORKING_HOURS,
} from "../constants/live-chat.constant.js";

const autoReplySchema = {
  enabled: { type: Boolean, default: false },
  type: {
    type: String,
    enum: Object.values(AUTO_REPLY_TYPE),
    default: AUTO_REPLY_TYPE.TEXT,
  },
  text: { type: String, default: "" },
  templateId: { type: String, default: null },
  templateName: { type: String, default: null },
  language: { type: String, default: "en" },
};

export interface WhatsAppLiveChatSettings extends Document {
  organizationId: Types.ObjectId;
  accountId: Types.ObjectId;
  autoResolve: {
    enabled: boolean;
    mode: "flow" | "ai_agent" | null;
    chatFlowId: Types.ObjectId | null;
    aiAgentId: string | null;
    scheduleMode: "working_hours" | "off_hours" | "always";
  };
  workingHours: {
    timezone: string;
    days: { day: string; enabled: boolean; from: string; to: string }[];
  };
  welcomeMessage: {
    enabled: boolean;
    type: "text" | "template";
    text: string;
    templateId?: string | null;
    templateName?: string | null;
    language?: string | null;
  };
  offHoursMessage: {
    enabled: boolean;
    type: "text" | "template";
    text: string;
    templateId?: string | null;
    templateName?: string | null;
    language?: string | null;
  };
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<WhatsAppLiveChatSettings>(
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
    },
    autoResolve: {
      type: new Schema(
        {
          enabled: { type: Boolean, default: false },
          mode: {
            type: String,
            enum: Object.values(AUTO_RESOLVE_MODE),
            default: null,
          },
          chatFlowId: {
            type: Schema.Types.ObjectId,
            ref: "ChatFlow",
            default: null,
          },
          aiAgentId: { type: String, default: null },
          scheduleMode: {
            type: String,
            enum: Object.values(AUTO_RESOLVE_SCHEDULE),
            default: AUTO_RESOLVE_SCHEDULE.WORKING_HOURS,
          },
        },
        { _id: false },
      ),
      default: () => ({
        enabled: false,
        mode: null,
        chatFlowId: null,
        aiAgentId: null,
        scheduleMode: AUTO_RESOLVE_SCHEDULE.WORKING_HOURS,
      }),
    },
    workingHours: {
      type: new Schema(
        {
          timezone: { type: String, default: DEFAULT_WORKING_HOURS.timezone },
          days: {
            type: [
              {
                day: { type: String, required: true },
                enabled: { type: Boolean, default: false },
                from: { type: String, default: "09:00" },
                to: { type: String, default: "18:00" },
              },
            ],
            default: DEFAULT_WORKING_HOURS.days,
          },
        },
        { _id: false },
      ),
      default: () => DEFAULT_WORKING_HOURS,
    },
    welcomeMessage: {
      type: new Schema(autoReplySchema, { _id: false }),
      default: () => ({
        enabled: false,
        type: AUTO_REPLY_TYPE.TEXT,
        text: DEFAULT_WELCOME_TEXT,
        templateId: null,
        templateName: null,
        language: "en",
      }),
    },
    offHoursMessage: {
      type: new Schema(autoReplySchema, { _id: false }),
      default: () => ({
        enabled: false,
        type: AUTO_REPLY_TYPE.TEXT,
        text: DEFAULT_OFF_HOURS_TEXT,
        templateId: null,
        templateName: null,
        language: "en",
      }),
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_, ret) {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  },
);

export const WhatsAppLiveChatSettingsModel = model<WhatsAppLiveChatSettings>(
  "WhatsAppLiveChatSettings",
  schema,
);
