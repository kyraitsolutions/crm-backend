import type { TAiAgentConfig } from "../../types/ai-agent.type.js";
import { section } from "./prompt-utils.js";

const LENGTH_HINT: Record<string, string> = {
  short: "Keep replies to 1-2 short sentences.",
  medium: "Keep replies to 2-4 sentences.",
  long: "You may write a fuller reply, still concise.",
};

export const voicePrompt = (config: TAiAgentConfig) => {
  const voice = config.voice;
  const length = voice?.responseLength || "medium";
  return section("Voice", [
    `Tone: ${voice?.preset || "professional"}. Language: ${voice?.language || "en"}.`,
    LENGTH_HINT[length] || LENGTH_HINT.medium,
    voice?.customInstructions?.trim() || "",
  ]);
};
