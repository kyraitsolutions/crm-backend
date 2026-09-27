import { Document, Schema, Types, model } from "mongoose";

export interface AiKnowledgeChunk extends Document {
  organizationId: Types.ObjectId;
  accountId: Types.ObjectId;
  agentId: Types.ObjectId;
  sourceId: Types.ObjectId;
  documentId: Types.ObjectId;
  content: string;
  chunkIndex: number;
  vectorId: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<AiKnowledgeChunk>(
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
    documentId: {
      type: Schema.Types.ObjectId,
      ref: "AiKnowledgeDocument",
      required: true,
      index: true,
    },
    content: { type: String, required: true },
    chunkIndex: { type: Number, required: true },
    vectorId: { type: String, required: true, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, versionKey: false },
);

schema.index({ accountId: 1, agentId: 1, sourceId: 1, chunkIndex: 1 });

export const AiKnowledgeChunkModel = model<AiKnowledgeChunk>(
  "AiKnowledgeChunk",
  schema,
);
