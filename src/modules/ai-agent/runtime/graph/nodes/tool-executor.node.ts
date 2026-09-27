import { planToolCalls } from "../../../tools/services/tool-planner.service.js";
import { aiToolExecutorService } from "../../../tools/services/tool-executor.service.js";
import { aiToolRegistry } from "../../../tools/services/tool-registry.service.js";
import type { TRuntimeToolResult } from "../../types/runtime.type.js";
import type { AgentStateType } from "../state.js";

export const toolExecutorNode = async (state: AgentStateType) => {
  const tools = aiToolRegistry.forAgent(state.agentConfig);

  const connectedToolKeys = (state.agentConfig.skills || [])
    .filter((skill) => skill.enabled)
    .flatMap((skill) =>
      Array.isArray(skill.config?.connectedToolKeys)
        ? skill.config.connectedToolKeys
        : [],
    );

  const calls = planToolCalls({
    intent: state.detectedIntent,
    userMessage: state.userMessage,
    tools,
    contactId: state.contactId,
    leadId: state.leadId,
    connectedToolKeys,
    agentTools: state.agentConfig.tools || [],
    catalog: state.catalog,
    selectionId: state.selectionId,
  });

  const results: TRuntimeToolResult[] = [];
  let retrievedChunks = state.retrievedChunks;
  let shouldHandoff = state.shouldHandoff;
  let contactId = state.contactId;
  let leadId = state.leadId;

  for (const call of calls) {
    const result = await aiToolExecutorService.execute(call.key, call.args, {
      organizationId: state.organizationId,
      accountId: state.accountId,
      userMessage: state.userMessage,
      conversationId: state.conversationId,
      contactId,
      leadId,
      phone: state.phone,
      contactName: state.contactName,
      knowledgeSourceIds: state.agentConfig.knowledgeSourceIds || [],
      dryRun: state.dryRun,
      agentConfig: state.agentConfig,
    });

    results.push({
      key: result.key,
      ok: result.ok,
      data: { ...result.data, dryRun: result.dryRun, error: result.error },
    });
    if (result.retrievedChunks?.length) retrievedChunks = result.retrievedChunks;
    if (result.shouldHandoff) shouldHandoff = true;
    if (result.contactId) contactId = result.contactId;
    if (result.leadId) leadId = result.leadId;
  }

  if (!results.length) {
    results.push({
      key: "noop",
      ok: true,
      data: { note: "No enabled tools for this turn" },
    });
  }

  return {
    toolResults: results,
    retrievedChunks,
    shouldHandoff,
    contactId,
    leadId,
  };
};
