import { Types } from "mongoose";
import { AiKnowledgeChunkModel } from "../models/ai-knowledge-chunk.model.js";
import {
  AiKnowledgeDocumentModel,
  type AiKnowledgeDocument,
} from "../models/ai-knowledge-document.model.js";
import {
  AiKnowledgeSourceModel,
  type AiKnowledgeSource,
} from "../models/ai-knowledge-source.model.js";
import { AI_KNOWLEDGE_SOURCE_TYPE } from "../constants/knowledge.constant.js";

const asObjectId = (value: string | Types.ObjectId) =>
  value instanceof Types.ObjectId ? value : new Types.ObjectId(value);

const scope = (accountId: string, organizationId?: string) => {
  const filter: Record<string, unknown> = {
    accountId: asObjectId(accountId),
  };
  if (organizationId) filter.organizationId = asObjectId(organizationId);
  return filter;
};

export class AiKnowledgeRepository {
  attachAgent(accountId: string, organizationId: string, agentId: string) {
    return AiKnowledgeSourceModel.updateMany(
      {
        ...scope(accountId, organizationId),
        $or: [{ agentId: { $exists: false } }, { agentId: null }],
      },
      { $set: { agentId: asObjectId(agentId) } },
    );
  }

  listSources(accountId: string, organizationId?: string) {
    return AiKnowledgeSourceModel.find({
      ...scope(accountId, organizationId),
      status: { $ne: "archived" },
    }).sort({ updatedAt: -1 });
  }

  findSourceById(accountId: string, sourceId: string, organizationId?: string) {
    return AiKnowledgeSourceModel.findOne({
      ...scope(accountId, organizationId),
      _id: asObjectId(sourceId),
    });
  }

  findUrlSource(accountId: string, uri: string, organizationId?: string) {
    return AiKnowledgeSourceModel.findOne({
      ...scope(accountId, organizationId),
      type: AI_KNOWLEDGE_SOURCE_TYPE.URL,
      uri,
    });
  }

  findSourceByLegacyArticleId(accountId: string, articleId: string) {
    return AiKnowledgeSourceModel.findOne({
      accountId: asObjectId(accountId),
      legacyArticleId: asObjectId(articleId),
    });
  }

  createSource(payload: Partial<AiKnowledgeSource>) {
    return AiKnowledgeSourceModel.create(payload);
  }

  saveSource(source: AiKnowledgeSource) {
    return source.save();
  }

  async deleteSource(accountId: string, sourceId: string, organizationId?: string) {
    const deleted = await AiKnowledgeSourceModel.findOneAndDelete({
      ...scope(accountId, organizationId),
      _id: asObjectId(sourceId),
    });
    if (deleted) {
      await this.deleteChunksBySource(sourceId, accountId, organizationId);
    }
    return deleted;
  }

  deleteChunksBySource(sourceId: string, accountId?: string, organizationId?: string) {
    const filter: Record<string, unknown> = { sourceId: asObjectId(sourceId) };
    if (accountId) Object.assign(filter, scope(accountId, organizationId));
    return AiKnowledgeChunkModel.deleteMany(filter);
  }

  listDocuments(sourceId: string) {
    return AiKnowledgeDocumentModel.find({ sourceId: asObjectId(sourceId) });
  }

  createDocument(payload: Partial<AiKnowledgeDocument>) {
    return AiKnowledgeDocumentModel.create(payload);
  }

  saveDocument(document: AiKnowledgeDocument) {
    return document.save();
  }

  deleteDocumentsBySource(sourceId: string, accountId?: string) {
    const filter: Record<string, unknown> = { sourceId: asObjectId(sourceId) };
    if (accountId) filter.accountId = asObjectId(accountId);
    return AiKnowledgeDocumentModel.deleteMany(filter);
  }

  async replaceSourceChunks(
    chunks: Array<{
      organizationId: string;
      accountId: string;
      agentId: string;
      sourceId: string;
      documentId: string;
      content: string;
      chunkIndex: number;
      vectorId: string;
      metadata: Record<string, unknown>;
    }>,
  ) {
    if (!chunks.length) return [];
    return AiKnowledgeChunkModel.insertMany(chunks);
  }
}

export const aiKnowledgeRepository = new AiKnowledgeRepository();
