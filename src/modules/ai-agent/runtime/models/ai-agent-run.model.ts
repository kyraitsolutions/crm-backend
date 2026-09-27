import { Document, Schema, Types, model } from "mongoose";
import { AI_AGENT_RUN_STATUS } from "../constants/runtime.constant.js";
import type { TAiAgentRunStatus } from "../types/runtime.type.js";

export interface AiAgentRuntimeRun extends Document {
  organizationId: Types.ObjectId;
  accountId: Types.ObjectId;
  conversationId: Types.ObjectId;
  agentVersionId: Types.ObjectId | null;
  userMessage: string;
  assistantMessage: string;
  interactive: Record<string, unknown> | null;
  detectedIntent: string;
  intentConfidence: number;
  routeTaken: string;
  retrievedChunkIds: string[];
  toolResults: unknown[];
  shouldHandoff: boolean;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  status: TAiAgentRunStatus;
  error: string;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<AiAgentRuntimeRun>(
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
      ref: "AiAgentConversation",
      required: true,
      index: true,
    },
    agentVersionId: {
      type: Schema.Types.ObjectId,
      ref: "AiAgentVersion",
      default: null,
    },
    userMessage: { type: String, required: true },
    assistantMessage: { type: String, default: "" },
    interactive: { type: Schema.Types.Mixed, default: null },
    detectedIntent: { type: String, default: "" },
    intentConfidence: { type: Number, default: 0 },
    routeTaken: { type: String, default: "" },
    retrievedChunkIds: { type: [String], default: [] },
    toolResults: { type: [Schema.Types.Mixed], default: [] },
    shouldHandoff: { type: Boolean, default: false },
    promptTokens: { type: Number, default: 0 },
    completionTokens: { type: Number, default: 0 },
    latencyMs: { type: Number, default: 0 },
    status: {
      type: String,
      enum: Object.values(AI_AGENT_RUN_STATUS),
      default: AI_AGENT_RUN_STATUS.PROCESSING,
      index: true,
    },
    error: { type: String, default: "" },
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

schema.index({ accountId: 1, createdAt: -1 });
schema.index({ conversationId: 1, createdAt: -1 });

export const AiAgentRuntimeRunModel = model<AiAgentRuntimeRun>(
  "AiAgentRuntimeRun",
  schema,
);
