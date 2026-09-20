import { Document, Schema, Types, model } from "mongoose";

export interface WhatsAppAiAgentRun extends Document {
  organizationId: Types.ObjectId;
  accountId: Types.ObjectId;
  conversationId: Types.ObjectId;
  messageId: string;
  status: "queued" | "processing" | "completed" | "skipped" | "failed";
  intent: string;
  selectedActions: string[];
  toolsExecuted: string[];
  knowledgeIds: string[];
  leadScore: number;
  leadScoreLevel: string;
  outboundSent: boolean;
  escalated: boolean;
  tokens?: number;
  latencyMs?: number;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<WhatsAppAiAgentRun>(
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
      index: true,
    },
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    messageId: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ["queued", "processing", "completed", "skipped", "failed"],
      default: "queued",
      index: true,
    },
    intent: { type: String, default: "" },
    selectedActions: { type: [String], default: [] },
    toolsExecuted: { type: [String], default: [] },
    knowledgeIds: { type: [String], default: [] },
    leadScore: { type: Number, default: 0 },
    leadScoreLevel: { type: String, default: "" },
    outboundSent: { type: Boolean, default: false },
    escalated: { type: Boolean, default: false },
    tokens: Number,
    latencyMs: Number,
    error: String,
    startedAt: Date,
    completedAt: Date,
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const WhatsAppAiAgentRunModel = model<WhatsAppAiAgentRun>(
  "WhatsAppAiAgentRun",
  schema,
);
