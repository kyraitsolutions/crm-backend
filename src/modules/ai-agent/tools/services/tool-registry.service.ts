import {
  AI_AGENT_TOOL_KEY,
  AI_AGENT_TOOL_SENSITIVITY,
  AI_AGENT_TOOL_TYPE,
} from "../../constants/ai-agent.constant.js";
import type { TAiAgentConfig } from "../../types/ai-agent.type.js";
import {
  createLeadArgsSchema,
  customApiArgsSchema,
  escalateToHumanArgsSchema,
  searchKnowledgeArgsSchema,
  updateContactArgsSchema,
  updateLeadArgsSchema,
} from "../schemas/system-tools.schema.js";
import type { TAiToolDefinition } from "../types/tool.type.js";

const SYSTEM_TOOLS: TAiToolDefinition[] = [
  {
    key: AI_AGENT_TOOL_KEY.SEARCH_KNOWLEDGE,
    name: "Search knowledge",
    description: "Search tenant knowledge for grounded facts.",
    type: AI_AGENT_TOOL_TYPE.SYSTEM,
    sensitivity: AI_AGENT_TOOL_SENSITIVITY.READ_ONLY,
    requiresConfirmation: false,
    argsSchema: searchKnowledgeArgsSchema,
  },
  {
    key: AI_AGENT_TOOL_KEY.UPDATE_CONTACT,
    name: "Update contact",
    description: "Update name, email, phone, or company on the current contact.",
    type: AI_AGENT_TOOL_TYPE.SYSTEM,
    sensitivity: AI_AGENT_TOOL_SENSITIVITY.LOW_RISK_WRITE,
    requiresConfirmation: false,
    argsSchema: updateContactArgsSchema,
  },
  {
    key: AI_AGENT_TOOL_KEY.CREATE_LEAD,
    name: "Create lead",
    description: "Create a CRM lead from this conversation.",
    type: AI_AGENT_TOOL_TYPE.SYSTEM,
    sensitivity: AI_AGENT_TOOL_SENSITIVITY.LOW_RISK_WRITE,
    requiresConfirmation: false,
    argsSchema: createLeadArgsSchema,
  },
  {
    key: AI_AGENT_TOOL_KEY.UPDATE_LEAD,
    name: "Update lead",
    description: "Update fields on the current lead.",
    type: AI_AGENT_TOOL_TYPE.SYSTEM,
    sensitivity: AI_AGENT_TOOL_SENSITIVITY.LOW_RISK_WRITE,
    requiresConfirmation: false,
    argsSchema: updateLeadArgsSchema,
  },
  {
    key: AI_AGENT_TOOL_KEY.ESCALATE_TO_HUMAN,
    name: "Escalate to human",
    description: "Stop automation and hand the conversation to a teammate.",
    type: AI_AGENT_TOOL_TYPE.SYSTEM,
    sensitivity: AI_AGENT_TOOL_SENSITIVITY.LOW_RISK_WRITE,
    requiresConfirmation: false,
    argsSchema: escalateToHumanArgsSchema,
  },
];

export class AiToolRegistry {
  get(key: string) {
    return SYSTEM_TOOLS.find((tool) => tool.key === key) || null;
  }

  listCatalog() {
    return SYSTEM_TOOLS.map((tool) => this.serialize(tool));
  }

  forAgent(config: TAiAgentConfig) {
    const enabled = new Map(
      (config.tools || []).map((tool) => [tool.key, tool]),
    );
    const selected = SYSTEM_TOOLS.filter((tool) => enabled.get(tool.key)?.enabled);
    const custom = (config.tools || []).filter(
      (tool) =>
        tool.enabled &&
        tool.type === AI_AGENT_TOOL_TYPE.CUSTOM_API &&
        !SYSTEM_TOOLS.some((item) => item.key === tool.key),
    );
    return [
      ...selected,
      ...custom.map(
        (tool): TAiToolDefinition => ({
          key: tool.key,
          name: tool.name,
          description: tool.description,
          type: tool.type,
          sensitivity: tool.sensitivity,
          requiresConfirmation:
            tool.sensitivity === AI_AGENT_TOOL_SENSITIVITY.HIGH_RISK_WRITE,
          argsSchema: customApiArgsSchema,
        }),
      ),
    ];
  }

  serialize(tool: TAiToolDefinition) {
    return {
      key: tool.key,
      name: tool.name,
      description: tool.description,
      type: tool.type,
      sensitivity: tool.sensitivity,
      requiresConfirmation: tool.requiresConfirmation,
    };
  }
}

export const aiToolRegistry = new AiToolRegistry();
