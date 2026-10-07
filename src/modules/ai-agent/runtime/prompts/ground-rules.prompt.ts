import type { TAiAgentConfig } from "../../types/ai-agent.type.js";
import { section } from "./prompt-utils.js";

export const groundRulesPrompt = (config: TAiAgentConfig) => {
  const rules = (config.groundRules || []).map((rule) => rule.trim()).filter(Boolean);
  if (!rules.length) return "";
  return section("Ground rules", [
    "Follow these when they do not conflict with platform safety or WhatsApp limits.",
    ...rules.map((rule) => `- ${rule}`),
  ]);
};
