import { Annotation } from "@langchain/langgraph";
import type { TAiAgentConfig } from "../../types/ai-agent.type.js";
import type { TRetrievedChunk } from "../../types/knowledge.type.js";
import type {
  TAiAgentRoute,
  TRuntimeMessage,
  TRuntimeToolResult,
} from "../types/runtime.type.js";

export const AgentState = Annotation.Root({
  organizationId: Annotation<string>,
  accountId: Annotation<string>,
  userMessage: Annotation<string>,
  conversationId: Annotation<string>,
  agentConfig: Annotation<TAiAgentConfig>,
  conversationHistory: Annotation<TRuntimeMessage[]>,
  safetyCheckPassed: Annotation<boolean>,
  detectedIntent: Annotation<string | null>,
  intentConfidence: Annotation<number>,
  routeDecision: Annotation<TAiAgentRoute | null>,
  retrievedChunks: Annotation<TRetrievedChunk[]>,
  toolResults: Annotation<TRuntimeToolResult[]>,
  assistantMessage: Annotation<string | null>,
  replyInteractive: Annotation<Record<string, unknown> | null>,
  replyImage: Annotation<{ link: string } | null>,
  catalog: Annotation<{
    sourceKey: string;
    items: { id: string; title: string }[];
    selectedId: string;
    choices: { id: string; title: string; field: string; kind: "image" | "text" }[];
    selected: {
      id: string;
      title: string;
      price: string;
      description: string;
      image: string;
      rating: string;
    } | null;
  }>,
  shouldHandoff: Annotation<boolean>,
  dryRun: Annotation<boolean>,
  contactId: Annotation<string>,
  leadId: Annotation<string>,
  phone: Annotation<string>,
  contactName: Annotation<string>,
  selectionId: Annotation<string>,
  promptTokens: Annotation<number>,
  completionTokens: Annotation<number>,
  latencyMs: Annotation<number>,
});

export type AgentStateType = typeof AgentState.State;
