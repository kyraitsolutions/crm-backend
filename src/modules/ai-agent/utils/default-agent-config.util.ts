import {
  AI_AGENT_RESPONSE_LENGTH,
  AI_AGENT_TOOL_KEY,
  AI_AGENT_TOOL_SENSITIVITY,
  AI_AGENT_TOOL_TYPE,
  AI_AGENT_VOICE_PRESET,
  DEFAULT_GROUND_RULES,
  DEFAULT_VOICE_INSTRUCTIONS,
} from "../constants/ai-agent.constant.js";
import {
  DEFAULT_SKILL_TYPES,
  catalogItemToSkill,
  findSkillCatalogItem,
} from "../constants/skill-catalog.constant.js";
import type { TAiAgentConfig } from "../types/ai-agent.type.js";

export const createDefaultAgentConfig = (
  overrides?: Partial<TAiAgentConfig>,
): TAiAgentConfig => ({
  identity: {
    name: "",
    website: "",
    greeting: "",
    description: "",
    industry: "",
    timezone: "Asia/Kolkata",
    ...overrides?.identity,
  },
  groundRules: overrides?.groundRules?.length
    ? overrides.groundRules
    : [...DEFAULT_GROUND_RULES],
  voice: {
    preset: AI_AGENT_VOICE_PRESET.PROFESSIONAL,
    customInstructions: DEFAULT_VOICE_INSTRUCTIONS,
    responseLength: AI_AGENT_RESPONSE_LENGTH.MEDIUM,
    language: "en",
    interactiveReplies: true,
    ...overrides?.voice,
  },
  skills: overrides?.skills?.length
    ? overrides.skills
    : DEFAULT_SKILL_TYPES.map((type) => {
        const item = findSkillCatalogItem(type);
        if (!item) {
          throw new Error(`Missing default skill catalog item: ${type}`);
        }
        return catalogItemToSkill(item);
      }),
  tools: overrides?.tools?.length
    ? overrides.tools
    : [
        {
          key: AI_AGENT_TOOL_KEY.SEARCH_KNOWLEDGE,
          name: "Search knowledge",
          type: AI_AGENT_TOOL_TYPE.SYSTEM,
          enabled: true,
          sensitivity: AI_AGENT_TOOL_SENSITIVITY.READ_ONLY,
          description: "Retrieve tenant-scoped knowledge for this agent.",
          config: {},
        },
        {
          key: AI_AGENT_TOOL_KEY.UPDATE_CONTACT,
          name: "Update contact",
          type: AI_AGENT_TOOL_TYPE.SYSTEM,
          enabled: true,
          sensitivity: AI_AGENT_TOOL_SENSITIVITY.LOW_RISK_WRITE,
          description: "Update the current contact record.",
          config: {},
        },
        {
          key: AI_AGENT_TOOL_KEY.CREATE_LEAD,
          name: "Create lead",
          type: AI_AGENT_TOOL_TYPE.SYSTEM,
          enabled: true,
          sensitivity: AI_AGENT_TOOL_SENSITIVITY.LOW_RISK_WRITE,
          description: "Create a CRM lead from this conversation.",
          config: {},
        },
        {
          key: AI_AGENT_TOOL_KEY.UPDATE_LEAD,
          name: "Update lead",
          type: AI_AGENT_TOOL_TYPE.SYSTEM,
          enabled: true,
          sensitivity: AI_AGENT_TOOL_SENSITIVITY.LOW_RISK_WRITE,
          description: "Update the current lead record.",
          config: {},
        },
        {
          key: AI_AGENT_TOOL_KEY.ESCALATE_TO_HUMAN,
          name: "Escalate to human",
          type: AI_AGENT_TOOL_TYPE.SYSTEM,
          enabled: true,
          sensitivity: AI_AGENT_TOOL_SENSITIVITY.LOW_RISK_WRITE,
          description: "Pause AI and hand the conversation to a teammate.",
          config: {},
        },
      ],
  knowledgeSourceIds: overrides?.knowledgeSourceIds ?? [],
  safety: {
    neverInventFacts: true,
    onHumanRequest: true,
    onUnknownInfo: true,
    onComplaint: true,
    onLowConfidence: true,
    lowConfidenceThreshold: 0.4,
    customerHandoffMessage:
      "I'm connecting you with a team member who can help from here.",
    ...overrides?.safety,
  },
  legacyWhatsApp: overrides?.legacyWhatsApp ?? null,
});
