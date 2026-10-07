import { runtimeLlm } from "../../../ai-agent/runtime/utils/llm.util.js";
import logger from "../../../../utils/logger.js";
import { HttpError } from "../../../../utils/http.error.js";
import { compileGeneratedFlow } from "../utils/chatflow-generate.util.js";

const SYSTEM = [
  "You design a WhatsApp chat flow as compact JSON.",
  "Return one object with nodes and edges. No markdown.",
  "Each node needs a short id and a type.",
  "Allowed types: send_message, question, button, list, condition, keyword, delay, set_attribute, add_tag, remove_tag, api_request, handoff, goto, end.",
  "send_message uses text.",
  "question uses text, inputType (text, email, phone, number, date, datetime, buttons, location, address, media), attribute, and options when inputType is buttons.",
  "button uses text and buttons (max 3 titles).",
  "list uses text, listButton, and rows [{title, description}].",
  "condition uses match all or any, and rules [{left, operator, right}]. Operators: equals, not_equals, contains, not_contains, gt, gte, lt, lte, empty, not_empty. left can be {{reply}} or {{attribute}}.",
  "keyword uses words as a comma-separated string and match contains, exact, or phrase.",
  "set_attribute uses key, value, scope flow|contact|conversation, and dataType text|number. value may be {{reply}}.",
  "add_tag and remove_tag use tag.",
  "delay uses amount and unit seconds|minutes|hours|days.",
  "api_request uses method and an https url.",
  "handoff uses note, reason, and customerMessage.",
  "goto uses target set to another node id.",
  "end has no extra fields.",
  "edges are {source, target, sourceHandle}. For a condition, sourceHandle true means the rule passed and false means it did not. Prefer operator not_empty when checking that an answer exists: connect true to the next step and false to the retry message. If you must use empty, connect true to the retry message and false to the next step. For keyword use matched or unmatched. For api_request use success or failure. Omit sourceHandle on every other edge.",
  "Use 2 to 8 nodes. Start with send_message when the prompt does not say otherwise. Do not invent templates, payments, catalogs, or private URLs.",
].join(" ");

export class ChatFlowGenerateService {
  async generate(input: { name?: string; prompt?: string }) {
    const prompt = String(input.prompt || "").trim();
    const name = String(input.name || "").trim().slice(0, 100);
    if (prompt.length < 8) {
      throw HttpError.badRequest("Describe the flow you want to generate");
    }

    if (!runtimeLlm.isAvailable()) {
      throw HttpError.internal("AI is not configured");
    }

    const plan = await runtimeLlm.completeJson({
      system: SYSTEM,
      user: prompt.slice(0, 2000),
      maxTokens: 1800,
      timeoutMs: 45_000,
    });
    
    if (!plan) {
      throw HttpError.internal("The AI could not build a flow. Try a shorter prompt.");
    }

    let compiled;
    try {
      compiled = compileGeneratedFlow(plan);
    } catch (error) {
      logger.warn("CHATFLOW_GENERATE_INVALID", {
        error: (error as Error).message,
      });
      throw HttpError.internal("The AI could not build a flow. Try a shorter prompt.");
    }

    logger.info("CHATFLOW_GENERATE_READY", {
      nodes: compiled.nodes.length,
      edges: compiled.edges.length,
    });

    return {
      name: name || "Untitled Flow",
      nodes: compiled.nodes,
      edges: compiled.edges,
    };
  }
}

export const chatFlowGenerateService = new ChatFlowGenerateService();
