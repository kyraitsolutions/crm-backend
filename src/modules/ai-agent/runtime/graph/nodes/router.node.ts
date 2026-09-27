import { AI_AGENT_INTENT, AI_AGENT_ROUTE } from "../../constants/runtime.constant.js";
import { AI_AGENT_TOOL_KEY } from "../../../constants/ai-agent.constant.js";
import {
  followUpField,
  matchCustomApis,
  matchProductChoice,
  pickDetailApis,
  productIdFromButton,
  resolveCatalogItem,
  selectedProductFollowUp,
} from "../../../tools/services/custom-api.service.js";
import type { AgentStateType } from "../state.js";

const isEnabled = (items: Array<{ key: string; enabled: boolean }>, key: string) =>
  items.some((item) => item.key === key && item.enabled);

const asksForInformation = (message: string) =>
  /^(how|what|when|where|why|which|who|can|do|does|is|are|will)\b/i.test(
    message.trim(),
  );

export const routerNode = async (state: AgentStateType) => {
  const { agentConfig } = state;
  const intent = state.detectedIntent;

  if (state.shouldHandoff) {
    return {
      routeDecision: AI_AGENT_ROUTE.HANDOFF,
      shouldHandoff: true,
    };
  }

  const tools = agentConfig.tools || [];
  const selected = resolveCatalogItem(state.userMessage, state.catalog?.items || []);
  const choice = matchProductChoice(state.userMessage, state.catalog?.choices || []);
  const rememberedId = state.catalog?.selectedId || state.catalog?.selected?.id || "";
  const buttonProductId = productIdFromButton(state.selectionId || "");
  const followUp = Boolean(
    (rememberedId || buttonProductId) &&
      (followUpField(state.userMessage) ||
        selectedProductFollowUp(state.userMessage, tools, rememberedId || buttonProductId)),
  );
  const clicked = Boolean(state.selectionId && !followUpField(state.userMessage));
  const hasProductCall =
    pickDetailApis(tools, state.catalog?.sourceKey).length ||
    tools.some((tool) => tool.enabled && tool.key === state.catalog?.sourceKey);
  if (followUp) {
    return { routeDecision: AI_AGENT_ROUTE.TOOL };
  }

  if ((selected || clicked || (choice && rememberedId)) && hasProductCall) {
    return { routeDecision: AI_AGENT_ROUTE.TOOL };
  }

  if (matchCustomApis(state.userMessage, tools).length) {
    return { routeDecision: AI_AGENT_ROUTE.TOOL };
  }

  const knowledgeToolOn = isEnabled(
    agentConfig.tools,
    AI_AGENT_TOOL_KEY.SEARCH_KNOWLEDGE,
  );
  if (
    knowledgeToolOn &&
    (intent === AI_AGENT_INTENT.QUESTION ||
      intent === AI_AGENT_INTENT.SUPPORT ||
      (intent === AI_AGENT_INTENT.BOOKING &&
        asksForInformation(state.userMessage)))
  ) {
    return { routeDecision: AI_AGENT_ROUTE.KNOWLEDGE };
  }

  if (
    (intent === AI_AGENT_INTENT.BOOKING ||
      intent === AI_AGENT_INTENT.QUALIFICATION) &&
    (isEnabled(agentConfig.tools, AI_AGENT_TOOL_KEY.CREATE_LEAD) ||
      isEnabled(agentConfig.tools, AI_AGENT_TOOL_KEY.UPDATE_LEAD) ||
      isEnabled(agentConfig.tools, AI_AGENT_TOOL_KEY.SEARCH_KNOWLEDGE))
  ) {
    return { routeDecision: AI_AGENT_ROUTE.TOOL };
  }

  if (knowledgeToolOn) {
    return { routeDecision: AI_AGENT_ROUTE.KNOWLEDGE };
  }

  return { routeDecision: AI_AGENT_ROUTE.RESPOND };
};
