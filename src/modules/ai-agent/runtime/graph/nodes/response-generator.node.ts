import logger from "../../../../../utils/logger.js";
import {
  followUpField,
  productForPrompt,
  productSnapshot,
  selectedFieldReply,
} from "../../../tools/services/custom-api.service.js";
import {
  imageFollowButtonTitles,
  normalizeAgentReply,
  selectionButtonTitles,
} from "../../utils/interactive-reply.util.js";
import { WHATSAPP_INTERACTIVE_LIMITS as LIMITS } from "../../../../whatsapp/messages/constants/whatsapp-interactive.constant.js";
import { runtimeLlm } from "../../utils/llm.util.js";
import { buildSystemPrompt } from "../../utils/prompt.util.js";
import type { AgentStateType } from "../state.js";

const faqAnswer = (state: AgentStateType) => {
  const best = [...(state.retrievedChunks || [])].sort(
    (a, b) => b.similarity - a.similarity,
  )[0];
  if (!best || best.similarity < 0.45) return "";
  const answer = best.content.match(/^Answer:\s*([\s\S]+)/im)?.[1]?.trim();
  return answer ? answer.slice(0, 500) : "";
};

const readableKnowledge = (content: string) =>
  content
    .replace(/(?:\+\d[\d-]*){8,}/g, " ")
    .replace(/\b(?:BOOK NOW|ENQUIRE NOW|LIMITED TIME OFFER)[:\s!-]*/gi, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const knowledgeReply = (state: AgentStateType) => {
  const faq = faqAnswer(state);
  if (faq) return faq;
  const cleaned = (state.retrievedChunks || [])
    .map((chunk) => readableKnowledge(chunk.content))
    .map((text) => {
      const words = text.split(/\s+/).filter((word) => /[a-z]{3,}/i.test(word));
      return { text, words: words.length };
    })
    .filter((item) => item.words >= 12)
    .sort((a, b) => b.words - a.words);
  const best = cleaned[0]?.text || "";
  if (!best) return "";
  const sentences = best.match(/[A-Z][^.]{25,220}\./g) || [];
  return (sentences.slice(0, 2).join("\n") || best).slice(0, 420);
};

const gaveUp = (text: string) =>
  /\b(i don't have|i do not have|don't have that|do not have that|no information)\b|connect you with|hand over|handing over|handoff|team member/i.test(
    text,
  );

const handoffMessage = (state: AgentStateType) =>
  state.agentConfig.safety.customerHandoffMessage ||
  "I'm connecting you with a team member who can help from here.";

const fallbackReply = (state: AgentStateType) => {
  if (state.shouldHandoff || state.agentConfig.safety.onUnknownInfo !== false) {
    return handoffMessage(state);
  }
  const fromKnowledge = knowledgeReply(state);
  if (fromKnowledge) return fromKnowledge;
  return handoffMessage(state);
};

export const responseGeneratorNode = async (state: AgentStateType) => {
  const started = Date.now();
  const toolResults = state.toolResults || [];
  console.log("TOOL_CALLS", JSON.stringify({
    message: state.userMessage,
    called: toolResults.length > 0,
    selectionId: state.selectionId,
    tools: toolResults.map((result) => ({
      key: result.key,
      ok: result.ok,
      data: result.data,
    })),
  }, null, 2));

  if (state.shouldHandoff && state.assistantMessage) {
    return { latencyMs: Date.now() - started };
  }

  const freshProduct = (state.toolResults || [])
    .map((result) => {
      const data = result.data as { record?: unknown; body?: unknown } | null;
      return productForPrompt(data?.record) || productForPrompt(data?.body);
    })
    .find(Boolean);
  const gallery = freshProduct?.images || [];
  if (followUpField(state.userMessage) === "image" && gallery.length >= LIMITS.carousel.minCards) {
    const follow = imageFollowButtonTitles(state.agentConfig.groundRules || []);
    const reply = normalizeAgentReply(
      JSON.stringify({
        messageType: "carousel",
        text: freshProduct!.name,
        cards: gallery.map((imageUrl) => ({ imageUrl, text: freshProduct!.name })),
        buttons: follow.map((title) => ({
          id: `${freshProduct!.id}_${title.toLowerCase().replace(/\s+/g, "_")}`,
          title,
        })),
      }),
      freshProduct!.name,
      state.agentConfig.voice.interactiveReplies !== false,
    );
    return {
      assistantMessage: reply.text,
      replyInteractive: reply.interactive,
      replyImage: null,
      latencyMs: Date.now() - started,
    };
  }

  const fresh = (state.toolResults || [])
    .map((result) => {
      const data = result.data as { record?: unknown; body?: unknown } | null;
      return productSnapshot(data?.record) || productSnapshot(data?.body);
    })
    .find(Boolean);
  const direct = selectedFieldReply(state.userMessage, fresh || state.catalog?.selected || null);
  
  if (direct) {
    return {
      assistantMessage: direct.text,
      replyInteractive: null,
      replyImage: direct.imageUrl ? { link: direct.imageUrl } : null,
      latencyMs: Date.now() - started,
    };
  }

  const system = buildSystemPrompt(state.agentConfig, {
    retrievedChunks: state.retrievedChunks,
    toolResults: state.toolResults,
    selectedProduct: state.catalog?.selected || null,
  });
  
  const history = (state.conversationHistory || [])
    .slice(-6)
    .map((item) => `${item.role}: ${item.content}`)
    .join("\n");

  if (!runtimeLlm.isAvailable()) {
    return {
      assistantMessage: fallbackReply(state),
      replyInteractive: null,
      latencyMs: Date.now() - started,
    };
  }

  try {
    const ask = (maxTokens: number) =>
      runtimeLlm.complete({
        system,
        user: `${history ? `${history}\n` : ""}user: ${state.userMessage}`,
        json: true,
        temperature: 0.3,
        maxTokens,
      });
    let result;
    try {
      result = await ask(1400);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/validate JSON/i.test(message)) throw error;
      result = await ask(1800);
    }
    let reply = normalizeAgentReply(
      result.text || "",
      fallbackReply(state),
      state.agentConfig.voice.interactiveReplies !== false,
    );
    const picked = (state.toolResults || [])
      .map((result) => {
        const data = result.data as { record?: unknown; body?: unknown } | null;
        return productForPrompt(data?.record) || productForPrompt(data?.body);
      })
      .find(Boolean);
    const titles = selectionButtonTitles(state.agentConfig.groundRules || []);
    const message = state.userMessage.trim().toLowerCase();
    const selecting =
      Boolean(picked) &&
      (state.selectionId === picked?.id ||
        (message.length > 8 && picked!.name.toLowerCase().startsWith(message)));
    if (selecting && titles.length) {
      reply = normalizeAgentReply(
        JSON.stringify({
          messageType: "button",
          text: picked!.name,
          buttons: titles.map((title) => ({
            id: `${picked!.id}_${title.toLowerCase().replace(/\s+/g, "_")}`,
            title,
          })),
        }),
        picked!.name,
        true,
      );
    }
    console.log("REPLY", JSON.stringify(reply, null, 2));
    const missingInfo = !reply.text || gaveUp(reply.text);
    const escalate = missingInfo && state.agentConfig.safety.onUnknownInfo !== false;
    return {
      shouldHandoff: escalate || state.shouldHandoff,
      assistantMessage: escalate ? handoffMessage(state) : reply.text,
      replyInteractive: escalate ? null : reply.interactive,
      replyImage: escalate || !reply.imageUrl ? null : { link: reply.imageUrl },
      promptTokens: (state.promptTokens || 0) + result.promptTokens,
      completionTokens: (state.completionTokens || 0) + result.completionTokens,
      latencyMs: Date.now() - started,
    };
  } catch (error) {
    logger.error("AI_AGENT_RESPONSE_FAILED", {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      assistantMessage: fallbackReply(state),
      replyInteractive: null,
      latencyMs: Date.now() - started,
    };
  }
};
