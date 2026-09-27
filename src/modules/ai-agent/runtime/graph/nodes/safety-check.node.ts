import { HUMAN_REQUEST_PHRASES } from "../../constants/runtime.constant.js";
import type { AgentStateType } from "../state.js";

const includesAny = (text: string, phrases: string[]) =>
  phrases.some((phrase) => text.includes(phrase));

export const safetyCheckNode = async (state: AgentStateType) => {
  const message = String(state.userMessage || "").toLowerCase();
  const safety = state.agentConfig.safety;
  
  const shouldHandoff =
    Boolean(safety.onHumanRequest) && includesAny(message, HUMAN_REQUEST_PHRASES);

  return {
    safetyCheckPassed: true,
    shouldHandoff,
    assistantMessage: shouldHandoff
      ? safety.customerHandoffMessage ||
        "I'm connecting you with a team member who can help from here."
      : state.assistantMessage,
  };
};
