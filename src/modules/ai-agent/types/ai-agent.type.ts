import type {
  AI_AGENT_RESPONSE_LENGTH,
  AI_AGENT_SKILL_KEY,
  AI_AGENT_STATUS,
  AI_AGENT_TOOL_KEY,
  AI_AGENT_TOOL_SENSITIVITY,
  AI_AGENT_TOOL_TYPE,
  AI_AGENT_VERSION_STATUS,
  AI_AGENT_VOICE_PRESET,
} from "../constants/ai-agent.constant.js";

export type TAiAgentStatus =
  (typeof AI_AGENT_STATUS)[keyof typeof AI_AGENT_STATUS];
export type TAiAgentVersionStatus =
  (typeof AI_AGENT_VERSION_STATUS)[keyof typeof AI_AGENT_VERSION_STATUS];
export type TAiAgentVoicePreset =
  (typeof AI_AGENT_VOICE_PRESET)[keyof typeof AI_AGENT_VOICE_PRESET];
export type TAiAgentResponseLength =
  (typeof AI_AGENT_RESPONSE_LENGTH)[keyof typeof AI_AGENT_RESPONSE_LENGTH];
export type TAiAgentSkillKey =
  (typeof AI_AGENT_SKILL_KEY)[keyof typeof AI_AGENT_SKILL_KEY];
export type TAiAgentToolKey =
  (typeof AI_AGENT_TOOL_KEY)[keyof typeof AI_AGENT_TOOL_KEY];
export type TAiAgentToolType =
  (typeof AI_AGENT_TOOL_TYPE)[keyof typeof AI_AGENT_TOOL_TYPE];
export type TAiAgentToolSensitivity =
  (typeof AI_AGENT_TOOL_SENSITIVITY)[keyof typeof AI_AGENT_TOOL_SENSITIVITY];

export type TAiAgentIdentity = {
  name: string;
  website: string;
  greeting: string;
  description: string;
  industry: string;
  timezone: string;
};

export type TAiAgentVoice = {
  preset: TAiAgentVoicePreset;
  customInstructions: string;
  responseLength: TAiAgentResponseLength;
  language: string;
  interactiveReplies: boolean;
};

export type TAiAgentSkillCollectField = {
  question: string;
  attribute: string;
  required: boolean;
};

export type TAiAgentSkillConfig = {
  key: string;
  type: string;
  enabled: boolean;
  name: string;
  icon?: string;
  whenToUse: string;
  instructions: string;
  config: {
    collectFields: TAiAgentSkillCollectField[];
    connectedToolKeys: string[];
    [key: string]: unknown;
  };
};

export type TAiAgentToolConfig = {
  key: string;
  name: string;
  type: TAiAgentToolType;
  enabled: boolean;
  sensitivity: TAiAgentToolSensitivity;
  description: string;
  config: Record<string, unknown>;
};

export type TAiAgentSafety = {
  neverInventFacts: boolean;
  onHumanRequest: boolean;
  onUnknownInfo: boolean;
  onComplaint: boolean;
  onLowConfidence: boolean;
  lowConfidenceThreshold: number;
  customerHandoffMessage: string;
};

export type TAiAgentConfig = {
  identity: TAiAgentIdentity;
  groundRules: string[];
  voice: TAiAgentVoice;
  skills: TAiAgentSkillConfig[];
  tools: TAiAgentToolConfig[];
  knowledgeSourceIds: string[];
  safety: TAiAgentSafety;
  legacyWhatsApp: Record<string, unknown> | null;
};

export type TAiAgent = {
  id: string;
  organizationId: string;
  accountId: string;
  name: string;
  status: TAiAgentStatus;
  activeVersionId: string | null;
  draftVersionId: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type TAiAgentVersion = {
  id: string;
  organizationId: string;
  accountId: string;
  agentId: string;
  version: number;
  status: TAiAgentVersionStatus;
  config: TAiAgentConfig;
  publishedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};
