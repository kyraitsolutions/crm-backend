import { aiAgentRepository } from "../repositories/ai-agent.repository.js";
import { AI_KNOWLEDGE_RETRIEVAL } from "../constants/knowledge.constant.js";
import type { TRetrievedChunk } from "../types/knowledge.type.js";
import { aiKnowledgeVectorService } from "./ai-knowledge-vector.service.js";

export class AiKnowledgeRetrieverService {
  async retrieve(input: {
    organizationId: string;
    accountId: string;
    agentId?: string;
    query: string;
    topK?: number;
  }): Promise<TRetrievedChunk[]> {
    const query = String(input.query || "").trim();
    if (!query) return [];
    const agent =
      input.agentId ||
      String((await aiAgentRepository.findByAccountId(input.accountId))?._id || "");
    if (!agent) return [];

    const hits = await aiKnowledgeVectorService.search(
      aiKnowledgeVectorService.namespace(input.organizationId, input.accountId, agent),
      query,
      input.topK || AI_KNOWLEDGE_RETRIEVAL.TOP_K,
      {
        organizationId: input.organizationId,
        accountId: input.accountId,
        agentId: agent,
      },
    );
    
    return hits.map(([doc, score]) => {
      const metadata = doc.metadata || {};
      const content = String(doc.pageContent || "");
      return {
        id: String(metadata.chunkId || ""),
        sourceId: String(metadata.sourceId || ""),
        title: String(metadata.title || ""),
        content,
        similarity: Number(score) || 0,
        metadata: {
          startChar: 0,
          endChar: content.length,
          title: String(metadata.title || ""),
          sourceUrl: String(metadata.sourceUrl || ""),
          heading: String(metadata.title || ""),
          contentType: String(metadata.sourceType || ""),
        },
      };
    });
  }
}

export const aiKnowledgeRetrieverService = new AiKnowledgeRetrieverService();
