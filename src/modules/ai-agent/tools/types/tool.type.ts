import type { z } from "zod";
import type {
  TAiAgentConfig,
  TAiAgentToolSensitivity,
  TAiAgentToolType,
} from "../../types/ai-agent.type.js";
import type { TRetrievedChunk } from "../../types/knowledge.type.js";

export type TAiToolCall = {
  key: string;
  args: Record<string, unknown>;
};

export type TAiToolContext = {
  organizationId: string;
  accountId: string;
  userMessage: string;
  conversationId: string;
  contactId: string;
  leadId: string;
  phone: string;
  contactName: string;
  knowledgeSourceIds: string[];
  dryRun: boolean;
  agentConfig: TAiAgentConfig;
};

export type TAiToolResult = {
  key: string;
  ok: boolean;
  dryRun: boolean;
  data: Record<string, unknown>;
  error?: string;
  retrievedChunks?: TRetrievedChunk[];
  shouldHandoff?: boolean;
  contactId?: string;
  leadId?: string;
};

export type TAiToolDefinition = {
  key: string;
  name: string;
  description: string;
  type: TAiAgentToolType;
  sensitivity: TAiAgentToolSensitivity;
  requiresConfirmation: boolean;
  argsSchema: z.ZodTypeAny;
};
