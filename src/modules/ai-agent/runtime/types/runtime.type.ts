import type { TAiAgentConfig } from "../../types/ai-agent.type.js";
import type { TRetrievedChunk } from "../../types/knowledge.type.js";
import type {
  AI_AGENT_CHANNEL,
  AI_AGENT_INTENT,
  AI_AGENT_ROUTE,
  AI_AGENT_RUN_STATUS,
} from "../constants/runtime.constant.js";

export type TAiAgentIntent =
  (typeof AI_AGENT_INTENT)[keyof typeof AI_AGENT_INTENT];
export type TAiAgentRoute =
  (typeof AI_AGENT_ROUTE)[keyof typeof AI_AGENT_ROUTE];
export type TAiAgentRunStatus =
  (typeof AI_AGENT_RUN_STATUS)[keyof typeof AI_AGENT_RUN_STATUS];
export type TAiAgentChannel =
  (typeof AI_AGENT_CHANNEL)[keyof typeof AI_AGENT_CHANNEL];

export type TRuntimeMessage = {
  role: "user" | "assistant";
  content: string;
};

export type TRuntimeToolResult = {
  key: string;
  ok: boolean;
  data: unknown;
};

export type TRuntimeInvokeInput = {
  organizationId: string;
  accountId: string;
  userMessage: string;
  history?: TRuntimeMessage[];
  useDraft?: boolean;
  threadId?: string;
  allowWrites?: boolean;
  contactId?: string;
  leadId?: string;
  phone?: string;
  contactName?: string;
  channel?: TAiAgentChannel;
  selectionId?: string;
};

export type TRuntimeInvokeResult = {
  threadId: string;
  runId: string;
  usingDraft: boolean;
  assistantMessage: string;
  interactive: Record<string, unknown> | null;
  image: { link: string } | null;
  shouldHandoff: boolean;
  detectedIntent: string | null;
  intentConfidence: number;
  routeTaken: TAiAgentRoute | null;
  retrievedChunks: TRetrievedChunk[];
  toolResults: TRuntimeToolResult[];
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
};

export type TRuntimeContext = {
  organizationId: string;
  accountId: string;
  agentConfig: TAiAgentConfig;
};
