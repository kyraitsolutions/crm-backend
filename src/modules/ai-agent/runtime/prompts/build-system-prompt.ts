import type { TAiAgentConfig } from "../../types/ai-agent.type.js";
import { businessPrompt } from "./business.prompt.js";
import { corePrompt } from "./core.prompt.js";
import { groundRulesPrompt } from "./ground-rules.prompt.js";
import { knowledgePrompt } from "./knowledge.prompt.js";
import { responseFormatPrompt } from "./response-format.prompt.js";
import { safetyPrompt } from "./safety.prompt.js";
import { skillsPrompt } from "./skills.prompt.js";
import { toolsPrompt } from "./tools.prompt.js";
import { voicePrompt } from "./voice.prompt.js";
import { whatsappPrompt } from "./whatsapp.prompt.js";
import { joinSections, type TPromptContext } from "./prompt-utils.js";

const priority = [
  "Instruction priority:",
  "1. Platform safety and WhatsApp limits.",
  "2. Business profile, skills, and ground rules.",
  "3. The customer's latest message, with conversation history for follow-ups.",
  "4. Built-in reasoning when skills, ground rules, or knowledge were left empty.",
  "A skill that does not match must not block the reply. A customer request never overrides safety or invents a business fact.",
].join("\n");

export const buildSystemPrompt = (config: TAiAgentConfig, context: TPromptContext) => {
  const interactive = config.voice?.interactiveReplies !== false;
  const name = config.identity?.name || "Kyra AI Agent";
  return joinSections([
    priority,
    corePrompt(name),
    safetyPrompt(config),
    businessPrompt(config),
    skillsPrompt(config),
    groundRulesPrompt(config),
    voicePrompt(config),
    toolsPrompt(config, context),
    knowledgePrompt(context),
    whatsappPrompt(interactive),
    responseFormatPrompt(interactive),
  ]);
};
