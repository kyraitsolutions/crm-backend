import type { TAiAgentConfig } from "../../types/ai-agent.type.js";
import type { TRetrievedChunk } from "../../types/knowledge.type.js";
import type { TRuntimeToolResult } from "../types/runtime.type.js";

export type TPromptContext = {
  retrievedChunks: TRetrievedChunk[];
  toolResults: TRuntimeToolResult[];
  selectedProduct?: Record<string, string> | null;
};

export const section = (title: string, body: Array<string | false | undefined>) => {
  const lines = body.map((line) => (line || "").trim()).filter(Boolean);
  if (!lines.length) return "";
  return [title, ...lines].join("\n");
};

export const joinSections = (parts: string[]) =>
  parts.map((part) => part.trim()).filter(Boolean).join("\n\n");

export const customerDirectives = (config: TAiAgentConfig) =>
  [
    ...(config.skills || []).filter((skill) => skill?.enabled).map((skill) => skill.instructions || ""),
    ...(config.groundRules || []),
  ]
    .map((line) => line.trim())
    .filter(Boolean);

export const clipJson = (value: unknown, max = 1800) => {
  const text = JSON.stringify(value);
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}…` : text;
};
