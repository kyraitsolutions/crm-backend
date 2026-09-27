import {
  AI_AGENT_INTENT,
  HUMAN_REQUEST_PHRASES,
} from "../../constants/runtime.constant.js";
import { runtimeLlm } from "../../utils/llm.util.js";
import type { AgentStateType } from "../state.js";

const INTENT_VALUES = Object.values(AI_AGENT_INTENT);

const heuristicIntent = (message: string) => {
  const text = message.toLowerCase();
  if (HUMAN_REQUEST_PHRASES.some((phrase) => text.includes(phrase))) {
    return { intent: AI_AGENT_INTENT.HANDOFF, confidence: 0.95 };
  }
  if (
    /(book|appointment|schedule|reservation|demo)/i.test(text) &&
    !/^(how|what|when|where|why|which|who|can|do|does|is|are|will)\b/i.test(
      text.trim(),
    )
  ) {
    return { intent: AI_AGENT_INTENT.BOOKING, confidence: 0.7 };
  }
  if (/(broken|issue|problem|not working|support|help me)/i.test(text)) {
    return { intent: AI_AGENT_INTENT.SUPPORT, confidence: 0.65 };
  }
  if (/(budget|timeline|company|decision maker|qualify)/i.test(text)) {
    return { intent: AI_AGENT_INTENT.QUALIFICATION, confidence: 0.6 };
  }
  return { intent: AI_AGENT_INTENT.QUESTION, confidence: 0.55 };
};

export const intentClassifierNode = async (state: AgentStateType) => {
  const fallback = heuristicIntent(state.userMessage);
  if (state.shouldHandoff) {
    return {
      detectedIntent: AI_AGENT_INTENT.HANDOFF,
      intentConfidence: Math.max(fallback.confidence, 0.9),
    };
  }

  if (!runtimeLlm.isAvailable()) {
    return {
      detectedIntent: fallback.intent,
      intentConfidence: fallback.confidence,
    };
  }

  try {
    const parsed = await runtimeLlm.completeJson({
      system:
        'Classify the user message. Return JSON {"intent":"question|booking|support|qualification|handoff","confidence":0-1}.',
      user: state.userMessage,
    });
    const intent = String(parsed?.intent || fallback.intent).toLowerCase();
    const confidence = Number(parsed?.confidence);
    return {
      detectedIntent: INTENT_VALUES.includes(
        intent as (typeof INTENT_VALUES)[number],
      )
        ? intent
        : fallback.intent,
      intentConfidence: Number.isFinite(confidence)
        ? Math.min(Math.max(confidence, 0), 1)
        : fallback.confidence,
    };
  } catch {
    return {
      detectedIntent: fallback.intent,
      intentConfidence: fallback.confidence,
    };
  }
};
