import type { AgentStateType } from "../state.js";

export const humanHandoffNode = async (state: AgentStateType) => {
  return {
    shouldHandoff: true,
    assistantMessage:
      state.assistantMessage ||
      state.agentConfig.safety.customerHandoffMessage ||
      "I'm connecting you with a team member who can help from here.",
  };
};
