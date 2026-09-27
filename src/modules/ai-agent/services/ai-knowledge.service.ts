import { Types } from "mongoose";
import { HttpError } from "../../../utils/http.error.js";
import logger from "../../../utils/logger.js";
import {
  AI_KNOWLEDGE_SOURCE_STATUS,
  AI_KNOWLEDGE_SOURCE_TYPE,
} from "../constants/knowledge.constant.js";
import type { CreateAiKnowledgeSourceDto } from "../dtos/ai-knowledge.dto.js";
import type { AiKnowledgeSource } from "../models/ai-knowledge-source.model.js";
import { aiAgentRepository } from "../repositories/ai-agent.repository.js";
import { aiKnowledgeRepository } from "../repositories/ai-knowledge.repository.js";
import {
  aiKnowledgeFileStore,
  assertKnowledgeFileUrl,
} from "./ai-knowledge-file-store.js";
import { KnowledgeIngestError } from "../utils/knowledge-error.util.js";
import { aiKnowledgeVectorService } from "./ai-knowledge-vector.service.js";
import type { TAiKnowledgeRetrieveInput } from "../types/knowledge.type.js";
import { normalizePublicUrl } from "../utils/url-normalize.util.js";
import { assertPublicHttpUrl } from "../tools/utils/url-guard.util.js";
import { aiKnowledgeIngestionService } from "./ai-knowledge-ingestion.service.js";
import { aiKnowledgeRetrieverService } from "./ai-knowledge-retriever.service.js";
import { enqueueKnowledgeIngestionJob } from "../../../queue/index.js";

const asObjectId = (value: unknown) => new Types.ObjectId(String(value));

export class AiKnowledgeService {
  async list(organizationId: string, accountId: string) {
    const agent = await aiAgentRepository.findByAccountId(accountId);
    if (!agent || String(agent.organizationId) !== organizationId) return [];
    await aiKnowledgeRepository.attachAgent(accountId, organizationId, String(agent._id));
    const docs = await aiKnowledgeRepository.listSources(accountId, organizationId);
    return docs.map((doc) => this.serialize(doc));
  }

  async create(
    organizationId: string,
    accountId: string,
    dto: CreateAiKnowledgeSourceDto,
  ) {
    if (dto.type === AI_KNOWLEDGE_SOURCE_TYPE.FILE) {
      dto.uri = this.uploadedFileUrl(dto.uri);
    }
    if (dto.type === AI_KNOWLEDGE_SOURCE_TYPE.URL) {
      dto.uri = await this.publicUrl(dto.uri);
      const existing = await aiKnowledgeRepository.findUrlSource(
        accountId,
        dto.uri,
        organizationId,
      );
      if (existing) {
        if (!existing.agentId) {
          const agent = await this.requireAgent(organizationId, accountId);
          existing.agentId = asObjectId(agent._id);
        }
        existing.title = dto.title || existing.title;
        existing.tags = dto.tags.length ? dto.tags : existing.tags;
        existing.status = AI_KNOWLEDGE_SOURCE_STATUS.PENDING;
        existing.errorMessage = "";
        existing.progressMessage = "Preparing your knowledge...";
        await aiKnowledgeRepository.saveSource(existing);
        await this.scheduleIngestion(existing);
        
        const saved = await aiKnowledgeRepository.findSourceById(
          accountId,
          String(existing._id),
          organizationId,
        );

        return this.serialize(saved || existing);
      }
    }

    const agent = await this.requireAgent(organizationId, accountId);
    
    const source = await aiKnowledgeRepository.createSource({
      organizationId: asObjectId(organizationId),
      accountId: asObjectId(accountId),
      agentId: asObjectId(agent._id),
      type: dto.type,
      status: AI_KNOWLEDGE_SOURCE_STATUS.PENDING,
      title: dto.title,
      uri: dto.uri,
      content: dto.content,
      tags: dto.tags,
      checksum: "",
      documentCount: 0,
      chunkCount: 0,
      progressMessage: "Preparing your knowledge...",
      errorMessage: "",
      legacyArticleId: null,
    });



    if (dto.type === AI_KNOWLEDGE_SOURCE_TYPE.FILE) {
      await this.storeFileDocument(source, dto.uri, dto.title);
    } else if (dto.type !== AI_KNOWLEDGE_SOURCE_TYPE.URL && dto.content) {
      await this.storeTextDocument(source, dto.content);
    }

    await this.scheduleIngestion(source);

    const saved = await aiKnowledgeRepository.findSourceById(
      accountId,
      String(source._id),
      organizationId,
    );

    return this.serialize(saved || source);
  }

  async update(
    organizationId: string,
    accountId: string,
    sourceId: string,
    dto: CreateAiKnowledgeSourceDto,
  ) {
    const source = await aiKnowledgeRepository.findSourceById(
      accountId,
      sourceId,
      organizationId,
    );
    if (!source) throw HttpError.notFound("Knowledge source not found");
    if (source.type === AI_KNOWLEDGE_SOURCE_TYPE.LEGACY_WHATSAPP) {
      throw HttpError.badRequest(
        "Imported WhatsApp articles are updated from the existing knowledge editor",
      );
    }

    if (dto.type === AI_KNOWLEDGE_SOURCE_TYPE.URL && dto.uri) {
      dto.uri = await this.publicUrl(dto.uri);
    }
    if (dto.type === AI_KNOWLEDGE_SOURCE_TYPE.FILE && dto.uri) {
      dto.uri = this.uploadedFileUrl(dto.uri);
    }
    source.title = dto.title || source.title;
    source.uri = dto.uri ?? source.uri;
    source.content = dto.content ?? source.content;
    source.tags = dto.tags;
    source.status = AI_KNOWLEDGE_SOURCE_STATUS.PENDING;
    source.checksum = "";
    source.errorMessage = "";
    source.progressMessage = "Preparing your knowledge...";
    if (dto.type === AI_KNOWLEDGE_SOURCE_TYPE.FILE && dto.uri) {
      await this.storeFileDocument(source, dto.uri, source.title);
    } else if (dto.content) {
      await this.storeTextDocument(source, dto.content);
    }
    await aiKnowledgeRepository.saveSource(source);
    await this.scheduleIngestion(source);
    const saved = await aiKnowledgeRepository.findSourceById(
      accountId,
      sourceId,
      organizationId,
    );
    return this.serialize(saved || source);
  }

  async remove(organizationId: string, accountId: string, sourceId: string) {
    const source = await aiKnowledgeRepository.findSourceById(
      accountId,
      sourceId,
      organizationId,
    );
    if (!source) throw HttpError.notFound("Knowledge source not found");
    if (source.type === AI_KNOWLEDGE_SOURCE_TYPE.LEGACY_WHATSAPP) {
      throw HttpError.badRequest(
        "Imported WhatsApp articles are removed from the existing knowledge editor",
      );
    }
    await this.purgeSourceIndex(source);
    const deleted = await aiKnowledgeRepository.deleteSource(
      accountId,
      sourceId,
      organizationId,
    );
    if (!deleted) throw HttpError.notFound("Knowledge source not found");
    return this.serialize(deleted);
  }

  async reindex(organizationId: string, accountId: string, sourceId: string) {
    const source = await aiKnowledgeRepository.findSourceById(
      accountId,
      sourceId,
      organizationId,
    );
    if (!source) throw HttpError.notFound("Knowledge source not found");
    source.status = AI_KNOWLEDGE_SOURCE_STATUS.PENDING;
    source.errorMessage = "";
    source.progressMessage = "Preparing your knowledge...";
    await aiKnowledgeRepository.saveSource(source);
    await this.scheduleIngestion(source);
    const saved = await aiKnowledgeRepository.findSourceById(
      accountId,
      sourceId,
      organizationId,
    );
    return this.serialize(saved || source);
  }

  retrieve(organizationId: string, accountId: string, input: TAiKnowledgeRetrieveInput) {
    return aiKnowledgeRetrieverService.retrieve({
      organizationId,
      accountId,
      query: input.query,
      topK: input.topK,
    });
  }

  async ingestById(organizationId: string, accountId: string, sourceId: string) {
    const source = await aiKnowledgeRepository.findSourceById(
      accountId,
      sourceId,
      organizationId,
    );
    console.log("organizationId", organizationId);


    console.log("source", source);
    if (!source) return null;

    if (String(source.organizationId) !== organizationId) return null;
    
    if (!source.agentId) {
      const agent = await this.requireAgent(organizationId, accountId);
      source.agentId = asObjectId(agent._id);
      await aiKnowledgeRepository.saveSource(source);
    }


  
    
    return aiKnowledgeIngestionService.ingestSource(source);
  }

  private async requireAgent(organizationId: string, accountId: string) {
    const agent = await aiAgentRepository.findByAccountId(accountId);
    if (!agent || String(agent.organizationId) !== organizationId) {
      throw HttpError.notFound("AI agent not found");
    }
    return agent;
  }

  private uploadedFileUrl(raw: string) {
    try {
      return assertKnowledgeFileUrl(raw);
    } catch (error) {
      if (error instanceof KnowledgeIngestError) {
        throw HttpError.badRequest(error.message);
      }
      throw error;
    }
  }

  private async storeFileDocument(
    source: AiKnowledgeSource,
    fileUrl: string,
    fileName: string,
  ) {
    await aiKnowledgeRepository.deleteDocumentsBySource(
      String(source._id),
      String(source.accountId),
    );
    await aiKnowledgeRepository.createDocument({
      organizationId: source.organizationId,
      accountId: source.accountId,
      agentId: asObjectId(source.agentId),
      sourceId: asObjectId(source._id),
      type: source.type,
      title: source.title,
      sourceUrl: fileUrl,
      mimeType: "application/pdf",
      content: "",
      storageKey: fileUrl,
      status: AI_KNOWLEDGE_SOURCE_STATUS.PENDING,
      contentHash: "",
      metadata: { fileName },
      chunkCount: 0,
      processedAt: null,
    });
  }

  private async storeTextDocument(source: AiKnowledgeSource, content: string) {
    await aiKnowledgeRepository.deleteDocumentsBySource(
      String(source._id),
      String(source.accountId),
    );
    await aiKnowledgeRepository.createDocument({
      organizationId: source.organizationId,
      accountId: source.accountId,
      agentId: asObjectId(source.agentId),
      sourceId: asObjectId(source._id),
      type: source.type,
      title: source.title,
      sourceUrl: "",
      mimeType: "text/plain",
      content,
      storageKey: "",
      status: AI_KNOWLEDGE_SOURCE_STATUS.PENDING,
      contentHash: "",
      metadata: {},
      chunkCount: 0,
      processedAt: null,
    });
  }

  private async purgeSourceIndex(source: AiKnowledgeSource) {
    const documents = await aiKnowledgeRepository.listDocuments(String(source._id));
    await aiKnowledgeVectorService.deleteBySource(
      aiKnowledgeVectorService.namespace(
        String(source.organizationId),
        String(source.accountId),
        String(source.agentId || ""),
      ),
      String(source._id),
      {
        organizationId: String(source.organizationId),
        accountId: String(source.accountId),
        agentId: String(source.agentId || ""),
      },
    );
    await aiKnowledgeFileStore.remove(source.uri);
    for (const document of documents) {
      if (document.storageKey && document.storageKey !== source.uri) {
        await aiKnowledgeFileStore.remove(document.storageKey);
      }
    }
    await aiKnowledgeRepository.deleteDocumentsBySource(
      String(source._id),
      String(source.accountId),
    );
  }

  private async publicUrl(raw: string) {
    const normalized = normalizePublicUrl(raw);
    if (!normalized) {
      throw HttpError.badRequest("Please enter a valid public website URL.");
    }
    try {
      await assertPublicHttpUrl(normalized);
    } catch {
      throw HttpError.badRequest("Please enter a valid public website URL.");
    }
    return normalized;
  }

  private async scheduleIngestion(source: AiKnowledgeSource) {
    try {
      await enqueueKnowledgeIngestionJob({
        organizationId: String(source.organizationId),
        accountId: String(source.accountId),
        sourceId: String(source._id),
      });
      return;
    } catch (error) {
      logger.warn("AI_KNOWLEDGE_ENQUEUE_FAILED", {
        sourceId: String(source._id),
        error: error instanceof Error ? error.message : String(error),
      });
    }
    // try {
    //   await aiKnowledgeIngestionService.ingestSource(source);
    // } catch (error) {
    //   logger.warn("AI_KNOWLEDGE_INLINE_INGEST_FAILED", {
    //     sourceId: String(source._id),
    //     error: error instanceof Error ? error.message : String(error),
    //   });
    // }
  }

  private serialize(doc: AiKnowledgeSource | Record<string, unknown>) {
    const json =
      typeof (doc as AiKnowledgeSource).toJSON === "function"
        ? (doc as AiKnowledgeSource).toJSON()
        : doc;
    const record = json as Record<string, unknown>;
    return {
      ...record,
      id: String(record.id || record._id),
      organizationId: String(record.organizationId || ""),
      accountId: String(record.accountId || ""),
      legacyArticleId: record.legacyArticleId
        ? String(record.legacyArticleId)
        : null,
    };
  }
}

export const aiKnowledgeService = new AiKnowledgeService();
