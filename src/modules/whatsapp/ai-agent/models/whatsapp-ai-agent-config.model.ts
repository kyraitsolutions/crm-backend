import { Document, Schema, Types, model } from "mongoose";
import {
  DEFAULT_AGENT_INSTRUCTIONS,
  DEFAULT_INTENTS,
  DEFAULT_SCORE_LEVELS,
  DEFAULT_SCORE_WEIGHTS,
} from "../constants/ai-agent.constant.js";

export type QualificationField = {
  key: string;
  label: string;
  required: boolean;
  type: "text" | "number" | "date" | "enum";
  options?: string[];
};

export type AgentIntent = {
  key: string;
  description: string;
};

export interface WhatsAppAiAgentConfig extends Document {
  organizationId: Types.ObjectId;
  accountId: Types.ObjectId;
  enabled: boolean;
  instructions: string;
  businessProfile: {
    name: string;
    industry: string;
    description: string;
    timezone: string;
  };
  qualificationFields: QualificationField[];
  intents: AgentIntent[];
  scoring: {
    weights: {
      requiredFieldsFilled: number;
      highIntent: number;
      timeline: number;
      budget: number;
      engagement: number;
    };
    levels: { min: number; max: number; level: string }[];
    notifyFromLevel: string;
    convertFromLevel: string;
    convertedStage: string;
    requirePaymentConfirmation: boolean;
  };
  discount: {
    enabled: boolean;
    maximumPercent: number;
    requiresApprovalAbovePercent: number;
    type: "percent";
  };
  escalation: {
    onHumanRequest: boolean;
    onUnknownInfo: boolean;
    onComplaint: boolean;
    onDiscountExceeded: boolean;
    onLowConfidence: boolean;
    onQualifiedLead: boolean;
    lowConfidenceThreshold: number;
    customerMessage: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const qualificationFieldSchema = new Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    required: { type: Boolean, default: false },
    type: {
      type: String,
      enum: ["text", "number", "date", "enum"],
      default: "text",
    },
    options: { type: [String], default: [] },
  },
  { _id: false },
);

const schema = new Schema<WhatsAppAiAgentConfig>(
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
    instructions: { type: String, default: DEFAULT_AGENT_INSTRUCTIONS },
    businessProfile: {
      name: { type: String, default: "" },
      industry: { type: String, default: "" },
      description: { type: String, default: "" },
      timezone: { type: String, default: "Asia/Kolkata" },
    },
    qualificationFields: {
      type: [qualificationFieldSchema],
      default: [],
    },
    intents: {
      type: [
        {
          key: { type: String, required: true },
          description: { type: String, default: "" },
        },
      ],
      default: DEFAULT_INTENTS,
    },
    scoring: {
      weights: {
        requiredFieldsFilled: {
          type: Number,
          default: DEFAULT_SCORE_WEIGHTS.requiredFieldsFilled,
        },
        highIntent: { type: Number, default: DEFAULT_SCORE_WEIGHTS.highIntent },
        timeline: { type: Number, default: DEFAULT_SCORE_WEIGHTS.timeline },
        budget: { type: Number, default: DEFAULT_SCORE_WEIGHTS.budget },
        engagement: { type: Number, default: DEFAULT_SCORE_WEIGHTS.engagement },
      },
      levels: {
        type: [
          {
            min: Number,
            max: Number,
            level: String,
          },
        ],
        default: DEFAULT_SCORE_LEVELS,
      },
      notifyFromLevel: { type: String, default: "HOT" },
      convertFromLevel: { type: String, default: "QUALIFIED" },
      convertedStage: { type: String, default: "converted" },
      requirePaymentConfirmation: { type: Boolean, default: false },
    },
    discount: {
      enabled: { type: Boolean, default: true },
      maximumPercent: { type: Number, default: 10 },
      requiresApprovalAbovePercent: { type: Number, default: 10 },
      type: { type: String, default: "percent" },
    },
    escalation: {
      onHumanRequest: { type: Boolean, default: true },
      onUnknownInfo: { type: Boolean, default: true },
      onComplaint: { type: Boolean, default: true },
      onDiscountExceeded: { type: Boolean, default: true },
      onLowConfidence: { type: Boolean, default: true },
      onQualifiedLead: { type: Boolean, default: false },
      lowConfidenceThreshold: { type: Number, default: 0.4 },
      customerMessage: {
        type: String,
        default:
          "I'm connecting you with a team member who can help from here.",
      },
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

export const WhatsAppAiAgentConfigModel = model<WhatsAppAiAgentConfig>(
  "WhatsAppAiAgentConfig",
  schema,
);
