import { Document, Schema, Types, model } from "mongoose";
import {
  AI_KNOWLEDGE_SOURCE_STATUS,
  AI_KNOWLEDGE_SOURCE_TYPE,
} from "../constants/knowledge.constant.js";
import type {
  TAiKnowledgeSourceStatus,
  TAiKnowledgeSourceType,
} from "../types/knowledge.type.js";

export interface AiKnowledgeSource extends Document {
  organizationId: Types.ObjectId;
  accountId: Types.ObjectId;
  agentId: Types.ObjectId;
  type: TAiKnowledgeSourceType;
  status: TAiKnowledgeSourceStatus;
  title: string;
  uri: string;
  content: string;
  checksum: string;
  tags: string[];
  documentCount: number;
  chunkCount: number;
  progressMessage: string;
  retrievalMode: "hybrid" | "keyword";
  errorMessage: string;
  legacyArticleId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<AiKnowledgeSource>(
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
    type: {
      type: String,
      enum: Object.values(AI_KNOWLEDGE_SOURCE_TYPE),
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(AI_KNOWLEDGE_SOURCE_STATUS),
      default: AI_KNOWLEDGE_SOURCE_STATUS.PENDING,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    uri: { type: String, default: "", trim: true },
    content: { type: String, default: "" },
    checksum: { type: String, default: "", index: true },
    tags: { type: [String], default: [] },
    documentCount: { type: Number, default: 0 },
    chunkCount: { type: Number, default: 0 },
    progressMessage: { type: String, default: "" },
    retrievalMode: {
      type: String,
      enum: ["hybrid", "keyword"],
      default: "hybrid",
    },
    errorMessage: { type: String, default: "" },
    legacyArticleId: {
      type: Schema.Types.ObjectId,
      ref: "WhatsAppAiAgentKnowledge",
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_, ret) {
        const row = ret as { id?: unknown; _id?: unknown; __v?: unknown };
        row.id = row._id;
        delete row._id;
        delete row.__v;
        return row;
      },
    },
  },
);

schema.index({ accountId: 1, status: 1, updatedAt: -1 });
schema.index(
  { accountId: 1, legacyArticleId: 1 },
  {
    unique: true,
    partialFilterExpression: { legacyArticleId: { $type: "objectId" } },
  },
);

export const AiKnowledgeSourceModel = model<AiKnowledgeSource>(
  "AiKnowledgeSource",
  schema,
);
