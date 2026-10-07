import type { TAiAgentConfig } from "../../types/ai-agent.type.js";
import { section } from "./prompt-utils.js";

export const skillsPrompt = (config: TAiAgentConfig) => {
  const skills = (config.skills || []).filter((skill) => skill?.enabled);
  if (!skills.length) return "";
  const blocks = skills.map((skill) => {
    const collect = Array.isArray(skill.config?.collectFields)
      ? skill.config.collectFields
          .filter((field) => field?.question && field?.attribute)
          .map(
            (field) =>
              `${field.question} → save to contact attribute "${field.attribute}"${
                field.required ? " (required before continuing)" : ""
              }`,
          )
      : [];
    const tools = Array.isArray(skill.config?.connectedToolKeys)
      ? skill.config.connectedToolKeys.filter(Boolean)
      : [];
    return [
      `Skill: ${skill.name}`,
      skill.whenToUse ? `Use when: ${skill.whenToUse}` : "",
      skill.instructions ? `Do this:\n${skill.instructions}` : "",
      collect.length ? `Questions to collect:\n- ${collect.join("\n- ")}` : "",
      tools.length ? `Connected actions: ${tools.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  });
  return section("Skills", [
    "Apply a skill only when the message matches it. Other messages are still in scope.",
    blocks.join("\n\n"),
  ]);
};
