import { aiKnowledgeRetrieverService } from "../../../services/ai-knowledge-retriever.service.js";
import type { AgentStateType } from "../state.js";

export const knowledgeRetrievalNode = async (state: AgentStateType) => {
  const chunks = await aiKnowledgeRetrieverService.retrieve({
    organizationId: state.organizationId,
    accountId: state.accountId,
    query: state.userMessage,
    topK: 4,
  });
  return { retrievedChunks: chunks };
};
