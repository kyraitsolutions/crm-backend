import { createHash } from "crypto";
import { Pinecone } from "@pinecone-database/pinecone";
import { Document } from "@langchain/core/documents";
import { KnowledgeIngestError } from "../utils/knowledge-error.util.js";
import logger from "../../../utils/logger.js";
import { config } from "../../../config/index.js";

const UPSERT_BATCH = 90;

const missingNamespace = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return /404|namespace not found/i.test(message);
};

export class AiKnowledgeVectorService {
  private client: Pinecone | null = null;

  isConfigured() {
    return Boolean(config.ai.pineconeApiKey && config.ai.pineconeIndex);
  }

  namespace(organizationId: string, accountId: string, agentId: string) {
    return createHash("sha256")
      .update(`${organizationId}:${accountId}:${agentId}`)
      .digest("hex")
      .slice(0, 32);
  }

  private assertReady() {
    if (this.isConfigured()) return;

    logger.error("AI_KNOWLEDGE_VECTOR_DISABLED", {
      pinecone: Boolean(config.ai.pineconeApiKey && config.ai.pineconeIndex),
    });

    throw new KnowledgeIngestError(
      "We couldn't finish processing this knowledge source. Please try again.",
      "vector_unavailable",
    );
  }

  private index() {
    this.assertReady();
    if (!this.client) this.client = new Pinecone({ apiKey: config.ai.pineconeApiKey });
    return this.client.index({ name: config.ai.pineconeIndex });
  }

  async upsert(namespace: string, documents: Document[], ids: string[]) {
    const records = documents.map((document, index) => {
      const metadata = (document.metadata || {}) as Record<string, unknown>;
      const record: Record<string, string> = {
        id: ids[index],
        text: document.pageContent,
      };
      for (const [key, value] of Object.entries(metadata)) {
        if (!value || key === "text" || key === "id") continue;
        record[key] = String(value);
      }
      return record;
    });

    for (let start = 0; start < records.length; start += UPSERT_BATCH) {
      await this.index().upsertRecords({
        namespace,
        records: records.slice(start, start + UPSERT_BATCH),
      });
    }
  }

  async search(
    namespace: string,
    query: string,
    topK: number,
    filter: Record<string, string>,
  ): Promise<Array<[Document, number]>> {
    if (!this.isConfigured() || !query.trim()) return [];
    try {
      const response = await this.index().searchRecords({
        namespace,
        fields: [
          "text",
          "sourceId",
          "documentId",
          "chunkId",
          "sourceType",
          "title",
          "sourceUrl",
          "fileName",
        ],
        query: {
          topK,
          filter,
          inputs: { text: query },
        },
      });
      return (response.result?.hits || []).map((hit) => {
        const fields = (hit.fields || {}) as Record<string, string>;
        return [
          new Document({
            pageContent: String(fields.text || ""),
            metadata: fields,
          }),
          Number(hit._score) || 0,
        ];
      });
    } catch (error) {
      if (missingNamespace(error)) return [];
      logger.error("AI_KNOWLEDGE_VECTOR_SEARCH_FAILED", {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  async deleteBySource(
    namespace: string,
    sourceId: string,
    scope: { organizationId: string; accountId: string; agentId: string },
  ) {
    if (!sourceId || !scope.agentId || !this.isConfigured()) return;
    try {
      await this.index().deleteMany({
        namespace,
        filter: {
          sourceId,
          organizationId: scope.organizationId,
          accountId: scope.accountId,
          agentId: scope.agentId,
        },
      });
    } catch (error) {
      if (missingNamespace(error)) return;
      throw error;
    }
  }
}

export const aiKnowledgeVectorService = new AiKnowledgeVectorService();
