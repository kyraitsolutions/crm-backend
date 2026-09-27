import { Document, Schema, Types, model } from "mongoose";
import {
  AI_KNOWLEDGE_SOURCE_STATUS,
  AI_KNOWLEDGE_SOURCE_TYPE,
} from "../constants/knowledge.constant.js";
import type {
  TAiKnowledgeSourceStatus,
  TAiKnowledgeSourceType,
} from "../types/knowledge.type.js";

export interface AiKnowledgeDocument extends Document {
  organizationId: Types.ObjectId;
  accountId: Types.ObjectId;
  agentId: Types.ObjectId;
  sourceId: Types.ObjectId;
  type: TAiKnowledgeSourceType;
  title: string;
  sourceUrl: string;
  mimeType: string;
  content: string;
  storageKey: string;
  status: TAiKnowledgeSourceStatus;
  contentHash: string;
  metadata: Record<string, unknown>;
  chunkCount: number;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<AiKnowledgeDocument>(
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
    agentId: {
      type: Schema.Types.ObjectId,
      ref: "AiAgent",
      required: true,
      index: true,
    },
    sourceId: {
      type: Schema.Types.ObjectId,
      ref: "AiKnowledgeSource",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(AI_KNOWLEDGE_SOURCE_TYPE),
      required: true,
    },
    title: { type: String, required: true, trim: true },
    sourceUrl: { type: String, default: "" },
    mimeType: { type: String, default: "" },
    content: { type: String, default: "" },
    storageKey: { type: String, default: "" },
    status: {
      type: String,
      enum: Object.values(AI_KNOWLEDGE_SOURCE_STATUS),
      default: AI_KNOWLEDGE_SOURCE_STATUS.PENDING,
    },
    contentHash: { type: String, default: "" },
    metadata: { type: Schema.Types.Mixed, default: {} },
    chunkCount: { type: Number, default: 0 },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

schema.index({ accountId: 1, agentId: 1, sourceId: 1 });

export const AiKnowledgeDocumentModel = model<AiKnowledgeDocument>(
  "AiKnowledgeDocument",
  schema,
);
