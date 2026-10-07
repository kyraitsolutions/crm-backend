import { aiToolRegistry } from "../../tools/services/tool-registry.service.js";
import { productForPrompt } from "../../tools/services/custom-api.service.js";
import type { TAiAgentConfig } from "../../types/ai-agent.type.js";
import { AI_AGENT_TOOL_SENSITIVITY } from "../../constants/ai-agent.constant.js";
import { clipJson, section, type TPromptContext } from "./prompt-utils.js";

const configured = (config: TAiAgentConfig, key: string) =>
  (config.tools || []).find((tool) => tool.key === key);

const describeTool = (config: TAiAgentConfig, key: string, name: string, description: string, sensitivity: string) => {
  const source = configured(config, key);
  const endpoint = String(source?.config?.endpoint || "");
  const needsId = /\{id\}/.test(endpoint);
  const examples = Array.isArray(source?.config?.examples)
    ? source.config.examples.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 2)
    : [];
  const effect =
    sensitivity === AI_AGENT_TOOL_SENSITIVITY.READ_ONLY
      ? "Read only."
      : sensitivity === AI_AGENT_TOOL_SENSITIVITY.HIGH_RISK_WRITE
        ? "This changes data. Do not claim it ran unless the result succeeded."
        : "This can write data. Do not claim it ran unless the result succeeded.";
  return [
    `- ${name}: ${description} ${effect}`,
    needsId ? "  Use it for one record the customer already identified. It needs that record's id." : "",
    endpoint && !needsId ? "  Use it when the request matches this description. It returns a collection, not one record by id." : "",
    examples.length ? `  Example requests: ${examples.join("; ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
};

const resultLines = (context: TPromptContext) => {
  const results = context.toolResults || [];
  if (!results.length) return [];
  let selected = false;
  const lines = ["Results from this turn. These are the only live facts you may state."];
  for (const result of results) {
    if (!result.ok) {
      lines.push(`- ${result.key} failed. Do not say it succeeded. ${clipJson(result.data)}`);
      continue;
    }
    const data = result.data as { record?: unknown; body?: unknown } | null;
    const product = productForPrompt(data?.record) || productForPrompt(data?.body);
    if (product) {
      selected = true;
      lines.push(`- ${result.key}: one record: ${clipJson(product)}`);
      continue;
    }
    lines.push(`- ${result.key}: ${clipJson(result.data)}`);
  }
  if (selected) {
    lines.push(
      "This is the record the customer just picked. Do not send the full catalog again and do not invent a second record.",
      "Answer only about this record: name, price, description, images, and variants when they are present.",
    );
  } else {
    lines.push(
      "If a result has body.items, those are the live records. body.count is the full total. Do not invent records that were not returned.",
      "A list row id must be that record's id. The row title keeps the real name. Put price or detail in the description.",
    );
  }
  return lines;
};

export const toolsPrompt = (config: TAiAgentConfig, context: TPromptContext) => {
  const available = aiToolRegistry.forAgent(config).map((tool) =>
    describeTool(config, tool.key, tool.name, tool.description, tool.sensitivity),
  );
  const selected = context.selectedProduct && Object.keys(context.selectedProduct).length
    ? `Record already selected. Use only these values for follow-ups:\n${clipJson(context.selectedProduct)}`
    : "";
  return section("Actions", [
    available.length
      ? "These actions are available. Match the customer's intent to an action from its description. Do not invent an action that is not listed."
      : "No business actions are configured. Do not pretend to search, book, or update anything.",
    ...available,
    ...(context.toolResults || []).length
      ? resultLines(context)
      : [
          "No records were returned for this turn. Do not invent products, prices, names, or ids. Reply in plain text that you do not have them.",
        ],
    selected,
  ]);
};
