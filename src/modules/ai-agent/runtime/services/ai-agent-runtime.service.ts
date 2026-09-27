import { randomUUID } from "crypto";
import { Types } from "mongoose";
import { HttpError } from "../../../../utils/http.error.js";
import { catalogFromBody, productSnapshot } from "../../tools/services/custom-api.service.js";
import { aiAgentService } from "../../services/ai-agent.service.js";
import {
  AI_AGENT_CHANNEL,
  AI_AGENT_RUN_STATUS,
} from "../constants/runtime.constant.js";
import { getAgentGraph } from "../graph/agent-graph.js";
import { AiAgentConversationModel } from "../models/ai-agent-conversation.model.js";
import { AiAgentRuntimeRunModel } from "../models/ai-agent-run.model.js";
import type {
  TAiAgentChannel,
  TRuntimeInvokeInput,
  TRuntimeInvokeResult,
} from "../types/runtime.type.js";

const asObjectId = (value: string) => new Types.ObjectId(value);

export class AiAgentRuntimeService {
  async invoke(input: TRuntimeInvokeInput): Promise<TRuntimeInvokeResult> {
    const started = Date.now();

    const { version, config, usingDraft } = await aiAgentService.loadRuntimeVersion(
      input.organizationId,
      input.accountId,
      Boolean(input.useDraft),
    );

    const conversation = await this.getOrCreateThread({
      organizationId: input.organizationId,
      accountId: input.accountId,
      agentVersionId: String(version._id),
      threadId: input.threadId,
      channel: input.channel || AI_AGENT_CHANNEL.TEST,
    });

    const run = await AiAgentRuntimeRunModel.create({
      organizationId: asObjectId(input.organizationId),
      accountId: asObjectId(input.accountId),
      conversationId: conversation._id,
      agentVersionId: version._id,
      userMessage: input.userMessage,
      status: AI_AGENT_RUN_STATUS.PROCESSING,
    });

    try {
      const graph = getAgentGraph();
      const state = await graph.invoke({
        organizationId: input.organizationId,
        accountId: input.accountId,
        userMessage: input.userMessage,
        conversationId: conversation.threadId,
        agentConfig: config,
        conversationHistory: input.history || [],
        safetyCheckPassed: false,
        detectedIntent: null,
        intentConfidence: 0,
        routeDecision: null,
        retrievedChunks: [],
        toolResults: [],
        assistantMessage: null,
        replyInteractive: null,
        replyImage: null,
        catalog: {
          sourceKey: conversation.catalog?.sourceKey || "",
          items: (conversation.catalog?.items || []).map((item) => ({
            id: String(item.id || ""),
            title: String(item.title || ""),
          })),
          selectedId: String(conversation.catalog?.selectedId || ""),
          selected: conversation.catalog?.selected || null,
          choices: (conversation.catalog?.choices || []).map((choice) => ({
            id: String(choice.id || ""),
            title: String(choice.title || ""),
            field: String(choice.field || ""),
            kind: choice.kind === "image" ? ("image" as const) : ("text" as const),
          })),
        },
        shouldHandoff: false,
        dryRun: input.allowWrites !== true,
        contactId: input.contactId || "",
        leadId: input.leadId || "",
        phone: input.phone || "",
        contactName: input.contactName || "",
        selectionId: input.selectionId || "",
        promptTokens: 0,
        completionTokens: 0,
        latencyMs: 0,
      });

      const latencyMs = Date.now() - started;
      run.assistantMessage = state.assistantMessage || "";
      run.interactive = state.replyInteractive || null;
      
      const nextCatalog = (state.toolResults || [])
        .map((result) =>
          catalogFromBody(result.key, (result.data as { body?: unknown } | null)?.body),
        )
        .find(Boolean);
      let snapshotKey = "";
      const snapshot = (state.toolResults || [])
        .map((result) => {
          const data = result.data as { record?: unknown; body?: unknown } | null;
          const next = productSnapshot(data?.record) || productSnapshot(data?.body);
          if (next && !snapshotKey) snapshotKey = result.key;
          return next;
        })
        .find(Boolean);
      if (nextCatalog) {
        conversation.catalog = nextCatalog;
        conversation.markModified("catalog");
        await conversation.save();
      } else if (snapshot) {
        conversation.catalog = {
          sourceKey: conversation.catalog?.sourceKey || snapshotKey,
          items: conversation.catalog?.items || [],
          selectedId: snapshot.id || conversation.catalog?.selectedId || "",
          choices: conversation.catalog?.choices || [],
          selected: snapshot,
        };
        conversation.markModified("catalog");
        await conversation.save();
      } else if (state.catalog?.selectedId && state.catalog.choices?.length) {
        conversation.catalog = {
          sourceKey: state.catalog.sourceKey || conversation.catalog?.sourceKey || "",
          items: state.catalog.items?.length
            ? state.catalog.items
            : conversation.catalog?.items || [],
          selectedId: state.catalog.selectedId,
          choices: state.catalog.choices,
          selected: state.catalog.selected || conversation.catalog?.selected || null,
        };
        await conversation.save();
      }
      run.detectedIntent = state.detectedIntent || "";
      run.intentConfidence = state.intentConfidence || 0;
      run.routeTaken = state.routeDecision || "";
      run.retrievedChunkIds = (state.retrievedChunks || []).map((chunk) => chunk.id);
      run.toolResults = state.toolResults || [];
      run.shouldHandoff = Boolean(state.shouldHandoff);
      run.promptTokens = state.promptTokens || 0;
      run.completionTokens = state.completionTokens || 0;
      run.latencyMs = state.latencyMs || latencyMs;
      run.status = AI_AGENT_RUN_STATUS.COMPLETED;
      await run.save();

      return {
        threadId: conversation.threadId,
        runId: String(run._id),
        usingDraft,
        assistantMessage: run.assistantMessage,
        interactive: state.replyInteractive || null,
        image: state.replyImage || null,
        shouldHandoff: run.shouldHandoff,
        detectedIntent: state.detectedIntent,
        intentConfidence: run.intentConfidence,
        routeTaken: state.routeDecision,
        retrievedChunks: state.retrievedChunks || [],
        toolResults: state.toolResults || [],
        promptTokens: run.promptTokens,
        completionTokens: run.completionTokens,
        latencyMs: run.latencyMs,
      };
    } catch (error) {
      run.status = AI_AGENT_RUN_STATUS.FAILED;
      run.error = error instanceof Error ? error.message : String(error);
      run.latencyMs = Date.now() - started;
      await run.save();
      throw error;
    }
  }

  async listRuns(accountId: string, threadId?: string) {
    const filter: Record<string, unknown> = { accountId: asObjectId(accountId) };
    if (threadId) {
      const conversation = await AiAgentConversationModel.findOne({
        accountId: asObjectId(accountId),
        threadId,
      }).select("_id");
      if (!conversation) return [];
      filter.conversationId = conversation._id;
    }
    const docs = await AiAgentRuntimeRunModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(50);
    return docs.map((doc) => this.serializeRun(doc));
  }

  async getRun(accountId: string, runId: string) {
    const doc = await AiAgentRuntimeRunModel.findOne({
      _id: asObjectId(runId),
      accountId: asObjectId(accountId),
    });
    if (!doc) throw HttpError.notFound("Runtime run not found");
    return this.serializeRun(doc);
  }

  private async getOrCreateThread(params: {
    organizationId: string;
    accountId: string;
    agentVersionId: string;
    threadId?: string;
    channel: TAiAgentChannel;
  }) {
    if (params.threadId) {
      const existing = await AiAgentConversationModel.findOne({
        accountId: asObjectId(params.accountId),
        threadId: params.threadId,
      });
      if (existing) return existing;
    }

    return AiAgentConversationModel.create({
      organizationId: asObjectId(params.organizationId),
      accountId: asObjectId(params.accountId),
      agentVersionId: asObjectId(params.agentVersionId),
      channel: params.channel,
      threadId: params.threadId || randomUUID(),
      status: "active",
    });
  }

  private serializeRun(doc: InstanceType<typeof AiAgentRuntimeRunModel>) {
    const json = doc.toJSON() as Record<string, unknown>;
    return {
      ...json,
      id: String(json.id || json._id),
      organizationId: String(json.organizationId || ""),
      accountId: String(json.accountId || ""),
      conversationId: String(json.conversationId || ""),
      agentVersionId: json.agentVersionId ? String(json.agentVersionId) : null,
    };
  }
}

export const aiAgentRuntimeService = new AiAgentRuntimeService();
