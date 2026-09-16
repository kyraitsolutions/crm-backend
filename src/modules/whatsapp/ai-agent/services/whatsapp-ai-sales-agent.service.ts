import { ConversationModel } from "../../../../models/conversations.model.js";
import { MessageModel } from "../../../../models/messages.model.js";
import { FEATURE } from "../../../../constants/subscription.constant.js";
import { SubscriptionService } from "../../../../services/subscription.service.js";
import { whatsAppAiAgentService } from "../../../../services/whatsapp-ai-agent.service.js";
import logger from "../../../../utils/logger.js";
import { WhatsAppLiveChatSettingsModel } from "../../live-chat/models/whatsapp-live-chat-settings.model.js";
import { AUTO_RESOLVE_MODE } from "../../live-chat/constants/live-chat.constant.js";
import { matchesAutoResolveWindow } from "../../live-chat/utils/auto-resolve.util.js";
import { isWithinWorkingHours } from "../../live-chat/utils/working-hours.util.js";
import { DEFAULT_AGENT_INSTRUCTIONS } from "../constants/ai-agent.constant.js";
import type { WhatsAppAiAgentConfig } from "../models/whatsapp-ai-agent-config.model.js";
import { WhatsAppAiAgentRunModel } from "../models/whatsapp-ai-agent-run.model.js";
import { WhatsAppAiAgentStateModel } from "../models/whatsapp-ai-agent-state.model.js";
import { aiAgentConfigService } from "./ai-agent-config.service.js";
import { aiAgentKnowledgeService } from "./ai-agent-knowledge.service.js";
import { aiAgentLlmService } from "./ai-agent-llm.service.js";
import { aiAgentScoringService } from "./ai-agent-scoring.service.js";
import { aiAgentToolsService } from "./ai-agent-tools.service.js";

export type AiAgentJob = {
  organizationId: string;
  accountId: string;
  conversationId: string;
  messageId: string;
  phone: string;
  inboundText: string;
  inboundType?: string;
  contactName?: string;
};

type AgentDecision = {
  intent?: string;
  intentConfidence?: number;
  entities?: Record<string, unknown>;
  requirements?: Record<string, unknown>;
  qualificationUpdates?: Record<string, unknown>;
  sentiment?: string;
  buyingStage?: string;
  urgency?: string;
  requestedDiscountPercent?: number | null;
  replyText?: string;
  actions?: { name: string; args?: Record<string, any> }[];
  escalate?: boolean;
  escalateReason?: string;
  missingFieldsToAsk?: string[];
  knowledgeUsed?: boolean;
  confidence?: number;
  informationUnavailable?: boolean;
};

const parseJson = (raw: string): AgentDecision | null => {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return null;
  }
};

const fieldValue = (lead: any, key: string) => {
  if (!lead) return "";
  if (lead[key]) return lead[key];
  const fields = lead.customFields;
  if (!fields) return "";
  if (typeof fields.get === "function") return fields.get(key);
  return fields[key];
};

const pickRelevantAssets = (
  assets: { canned: any[]; templates: any[] },
  inbound: string,
) => {
  const terms = inbound
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
  const scoreOf = (text: string) => {
    const hay = text.toLowerCase();
    return terms.reduce((count, term) => count + (hay.includes(term) ? 1 : 0), 0);
  };
  const rank = (
    items: any[],
    textOf: (item: any) => string,
    limit: number,
  ) => {
    const ranked = [...items].sort(
      (a, b) => scoreOf(textOf(b)) - scoreOf(textOf(a)),
    );
    const matched = ranked.filter((item) => scoreOf(textOf(item)) > 0);
    return (matched.length ? matched : ranked).slice(0, limit);
  };
  return {
    canned: rank(
      assets?.canned || [],
      (item) => `${item.name} ${item.shortcut} ${item.preview}`,
      6,
    ),
    templates: rank(
      assets?.templates || [],
      (item) => `${item.name} ${item.category}`,
      4,
    ),
  };
};

export class WhatsAppAiSalesAgentService {
  private subscriptionService = new SubscriptionService();

  async handleIncoming(job: AiAgentJob) {
    const started = Date.now();
    const claimed = await this.claimRun(job);
    if (!claimed) return { skipped: true, reason: "already_processed" };

    try {
      const result = await this.run(job);
      await WhatsAppAiAgentRunModel.updateOne(
        { messageId: job.messageId },
        {
          $set: {
            status: result.skipped ? "skipped" : "completed",
            intent: result.intent || "",
            selectedActions: result.actions || [],
            toolsExecuted: result.tools || [],
            knowledgeIds: result.knowledgeIds || [],
            leadScore: result.score || 0,
            leadScoreLevel: result.level || "",
            escalated: Boolean(result.escalated),
            latencyMs: Date.now() - started,
            completedAt: new Date(),
            error: (result as { error?: string }).error || "",
          },
        },
      );
      return result;
    } catch (error) {
      const message = (error as Error).message;
      logger.error("WHATSAPP_AI_AGENT_FAILED", {
        messageId: job.messageId,
        conversationId: job.conversationId,
        error: message,
      });
      await WhatsAppAiAgentRunModel.updateOne(
        { messageId: job.messageId },
        {
          $set: {
            status: "failed",
            error: message,
            latencyMs: Date.now() - started,
            completedAt: new Date(),
          },
        },
      );
      throw error;
    }
  }

  async resumeConversation(params: {
    organizationId: string;
    accountId: string;
    conversationId: string;
  }) {
    const conversation = await ConversationModel.findOne({
      _id: params.conversationId,
      accountId: params.accountId,
    });
    if (!conversation) return { resumed: false, reason: "conversation_missing" };

    const liveChat = (conversation.metadata as any)?.liveChat || {};
    const wasPaused = Boolean(liveChat.humanIntervened || liveChat.escalationReason);
    if (!wasPaused) return { resumed: false, reason: "already_active" };

    const settings = await WhatsAppLiveChatSettingsModel.findOne({
      accountId: params.accountId,
    }).lean();
    const withinHours = isWithinWorkingHours(settings?.workingHours);
    const aiScheduled =
      Boolean(settings?.autoResolve?.enabled) &&
      settings?.autoResolve?.mode === AUTO_RESOLVE_MODE.AI_AGENT &&
      matchesAutoResolveWindow(settings?.autoResolve?.scheduleMode, withinHours);

    await ConversationModel.updateOne(
      { _id: params.conversationId, accountId: params.accountId },
      {
        $set: {
          "metadata.liveChat.humanIntervened": false,
          "metadata.liveChat.autoResolveActive": aiScheduled,
        },
        $unset: { "metadata.liveChat.escalationReason": 1 },
      },
    );
    await WhatsAppAiAgentStateModel.updateOne(
      { conversationId: params.conversationId, accountId: params.accountId },
      {
        $set: {
          "escalation.required": false,
          "escalation.reason": "",
          "escalation.at": null,
        },
      },
    );

    if (!aiScheduled) {
      return { resumed: false, reason: "outside_ai_schedule" };
    }

    const lastInbound = await MessageModel.findOne({
      conversationId: params.conversationId,
      direction: "inbound",
      from: "user",
    })
      .sort({ createdAt: -1 })
      .select("messageId searchText body.text type createdAt")
      .lean();

    const lastOutbound = await MessageModel.findOne({
      conversationId: params.conversationId,
      direction: "outbound",
    })
      .sort({ createdAt: -1 })
      .select("createdAt")
      .lean();

    const inboundText = String(
      lastInbound?.searchText || lastInbound?.body?.text || "",
    ).trim();
    const customerIsWaiting =
      Boolean(lastInbound) &&
      inboundText &&
      (!lastOutbound ||
        new Date(lastInbound!.createdAt).getTime() >=
          new Date(lastOutbound.createdAt).getTime());

    if (!customerIsWaiting) {
      return { resumed: true, queued: false };
    }

    const { enqueueWhatsAppAiAgentJob } = await import(
      "../../../../queue/whatsapp/ai-agent.queue.js"
    );
    await enqueueWhatsAppAiAgentJob({
      organizationId: params.organizationId,
      accountId: params.accountId,
      conversationId: params.conversationId,
      messageId: `resume:${params.conversationId}:${Date.now()}`,
      phone: String(conversation.contact?.phoneNumber || ""),
      inboundText,
      inboundType: String(lastInbound?.type || "text"),
      contactName: String(conversation.contact?.name || ""),
    });

    logger.info("WHATSAPP_AI_AGENT_RESUMED", {
      conversationId: params.conversationId,
      queued: true,
    });
    return { resumed: true, queued: true };
  }

  private async claimRun(job: AiAgentJob) {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    try {
      await WhatsAppAiAgentRunModel.create({
        organizationId: job.organizationId,
        accountId: job.accountId,
        conversationId: job.conversationId,
        messageId: job.messageId,
        status: "queued",
      });
    } catch (error: any) {
      if (error?.code !== 11000) throw error;
    }

    return WhatsAppAiAgentRunModel.findOneAndUpdate(
      {
        messageId: job.messageId,
        $or: [
          { status: { $in: ["queued", "failed"] } },
          { status: "processing", startedAt: { $lt: twoMinutesAgo } },
        ],
      },
      { $set: { status: "processing", startedAt: new Date() } },
      { new: true },
    );
  }

  private async run(job: AiAgentJob) {
    const conversation = await ConversationModel.findById(job.conversationId);
    if (!conversation) return { skipped: true, reason: "conversation_missing" };

    const liveChat = (conversation.metadata as any)?.liveChat || {};
    if (liveChat.humanIntervened || liveChat.escalationReason) {
      return { skipped: true, reason: "human_required" };
    }

    const [settings, canUse, config] = await Promise.all([
      WhatsAppLiveChatSettingsModel.findOne({ accountId: job.accountId }).lean(),
      this.subscriptionService
        .canAccessFeature(job.organizationId, FEATURE.WHATSAPP_AI_AGENT)
        .catch(() => false),
      aiAgentConfigService.getOrCreate(job.organizationId, job.accountId),
    ]);
    if (
      !settings?.autoResolve?.enabled ||
      settings.autoResolve.mode !== AUTO_RESOLVE_MODE.AI_AGENT
    ) {
      return { skipped: true, reason: "ai_agent_inactive" };
    }

    const withinHours = isWithinWorkingHours(settings.workingHours);
    if (!matchesAutoResolveWindow(settings.autoResolve.scheduleMode, withinHours)) {
      return { skipped: true, reason: "outside_ai_schedule" };
    }
    if (!canUse) return { skipped: true, reason: "feature_unavailable" };
    if (!config.enabled) return { skipped: true, reason: "config_disabled" };

    const inbound = String(job.inboundText || "").trim();
    if (!inbound) return { skipped: true, reason: "empty_inbound" };

    if (!String(job.messageId).startsWith("resume:")) {
      const latestInbound = await MessageModel.findOne({
        conversationId: job.conversationId,
        direction: "inbound",
      })
        .sort({ createdAt: -1 })
        .select("messageId")
        .lean();
      if (latestInbound?.messageId && latestInbound.messageId !== job.messageId) {
        return { skipped: true, reason: "superseded" };
      }
    }

    void aiAgentToolsService.sendTypingIndicator(job.accountId, job.messageId);

    const [state, history, knowledge, assets, contact, lead] = await Promise.all([
      WhatsAppAiAgentStateModel.findOneAndUpdate(
        { conversationId: job.conversationId },
        {
          $setOnInsert: {
            organizationId: job.organizationId,
            accountId: job.accountId,
            conversationId: job.conversationId,
          },
          $set: {
            lastInboundMessageId: job.messageId,
            phone: job.phone,
          },
        },
        { upsert: true, new: true },
      ),
      MessageModel.find({ conversationId: job.conversationId })
        .sort({ createdAt: -1 })
        .limit(6)
        .select("from searchText body.text type createdAt")
        .lean(),
      aiAgentKnowledgeService.retrieve(job.accountId, inbound, 2),
      aiAgentToolsService.listSendableAssets(job.accountId),
      aiAgentToolsService.findContact(job.accountId, job.phone),
      aiAgentToolsService.findOrCreateLead({
        accountId: job.accountId,
        organizationId: job.organizationId,
        phone: job.phone,
        name: job.contactName,
        inboundText: inbound,
        conversationId: job.conversationId,
      }),
    ]);

    if (state.escalation?.required) {
      return { skipped: true, reason: "already_escalated" };
    }

    const transcript = [...history].reverse().map((message: any) => ({
      from: message.from,
      text: message.searchText || message.body?.text || "",
      type: message.type,
    }));

    const decision = await this.reason({
      config: config as WhatsAppAiAgentConfig,
      inbound,
      transcript,
      knowledge,
      assets: pickRelevantAssets(assets, inbound),
      lead,
      state,
    });

    const qualificationUpdates = {
      ...(state.requirements || {}),
      ...(decision.requirements || {}),
      ...(decision.qualificationUpdates || {}),
      ...(decision.entities || {}),
    };

    const profile = {
      ...lead,
      customFields: {
        ...(lead?.customFields || {}),
        ...qualificationUpdates,
      },
    };

    const inboundCount = transcript.filter((item) => item.from === "user").length;
    const score = aiAgentScoringService.calculate({
      config: config as WhatsAppAiAgentConfig,
      lead: profile,
      intent: decision.intent || "",
      inboundCount,
      requestedDiscount: decision.requestedDiscountPercent,
      buyingStage: decision.buyingStage,
    });

    const maxDiscount = Number((config as WhatsAppAiAgentConfig).discount?.maximumPercent ?? 0);
    const requestedDiscount = Number(decision.requestedDiscountPercent || 0);
    const discountExceeded =
      Boolean((config as WhatsAppAiAgentConfig).discount?.enabled) &&
      requestedDiscount > 0 &&
      requestedDiscount > maxDiscount;

    const missingFields = ((config as WhatsAppAiAgentConfig).qualificationFields || [])
      .filter((field) => field.required && !fieldValue(profile, field.key))
      .map((field) => field.key);

    const ctx = {
      organizationId: job.organizationId,
      accountId: job.accountId,
      conversationId: job.conversationId,
      phone: job.phone,
      messageId: job.messageId,
      contactName: job.contactName || (contact as any)?.name || lead.name,
      businessName: (config as WhatsAppAiAgentConfig).businessProfile?.name,
    };

    const escalateReasons: string[] = [];
    const agentConfig = config as WhatsAppAiAgentConfig;
    if (decision.escalate && decision.escalateReason) escalateReasons.push(decision.escalateReason);
    if (agentConfig.escalation?.onHumanRequest && /HUMAN_REQUEST/i.test(String(decision.intent))) {
      escalateReasons.push("Customer requested a human");
    }
    if (agentConfig.escalation?.onComplaint && /SUPPORT|COMPLAINT/i.test(String(decision.intent))) {
      escalateReasons.push("Complaint or support issue");
    }
    if (agentConfig.escalation?.onUnknownInfo && decision.informationUnavailable) {
      escalateReasons.push("Requested information is not in the knowledge base");
    }
    if (agentConfig.escalation?.onDiscountExceeded && discountExceeded) {
      escalateReasons.push(`Discount ${requestedDiscount}% exceeds allowed ${maxDiscount}%`);
    }
    if (
      agentConfig.escalation?.onLowConfidence &&
      Number(decision.confidence ?? 1) < Number(agentConfig.escalation.lowConfidenceThreshold || 0.4)
    ) {
      escalateReasons.push("Low agent confidence");
    }
    if (
      agentConfig.escalation?.onQualifiedLead &&
      aiAgentScoringService.meetsLevel(agentConfig, score.level, agentConfig.scoring.convertFromLevel)
    ) {
      escalateReasons.push("Qualified lead requires human follow-up");
    }

    const shouldEscalate = escalateReasons.length > 0;
    const tools: string[] = [];
    const actions: string[] = [];
    let outboundCount = 0;

    const runDoc = await WhatsAppAiAgentRunModel.findOne({ messageId: job.messageId }).select("outboundSent");
    const alreadySent = Boolean(runDoc?.outboundSent);

    if (shouldEscalate) {
      if (!alreadySent && agentConfig.escalation?.customerMessage) {
        await aiAgentToolsService.sendText(ctx, agentConfig.escalation.customerMessage);
        tools.push("send_text");
        outboundCount += 1;
      }
    } else if (!alreadySent) {
      const planned = Array.isArray(decision.actions) ? decision.actions : [];
      const allowed = planned.filter((action) =>
        [
          "send_text",
          "send_canned_message",
          "send_template",
          "send_image",
          "send_video",
          "send_document",
          "send_carousel",
        ].includes(action.name),
      );

      if (!allowed.length && decision.replyText) {
        allowed.push({ name: "send_text", args: { text: decision.replyText } });
      }

      for (const action of allowed.slice(0, 2)) {
        if (outboundCount >= 2) break;
        const executed = await this.executeSend(action, ctx, profile);
        if (executed && "sent" in executed && executed.sent) {
          tools.push(action.name);
          actions.push(action.name);
          outboundCount += 1;
        }
      }

      if (!outboundCount && decision.replyText) {
        await aiAgentToolsService.sendText(ctx, decision.replyText);
        tools.push("send_text");
        outboundCount += 1;
      }
    }

    const updatedLead = await aiAgentToolsService.updateLeadFields({
      accountId: job.accountId,
      leadId: String(lead.id || lead._id),
      fields: {
        ...qualificationUpdates,
        ...(agentConfig.discount?.enabled &&
        requestedDiscount > 0 &&
        requestedDiscount <= maxDiscount
          ? { offered_discount: requestedDiscount }
          : {}),
      },
      score,
    });

    await ConversationModel.updateOne(
      { _id: job.conversationId, accountId: job.accountId },
      {
        $set: {
          score: score.score,
          scoreLevel: score.level,
        },
      },
    );

    if (shouldEscalate) {
      await aiAgentToolsService.escalate({
        ctx,
        config: agentConfig,
        reason: escalateReasons[0],
        lead: updatedLead || lead,
        score,
        message: inbound,
        intent: decision.intent,
      });
      tools.push("escalate_to_human");
      actions.push("escalate_to_human");
    }

    const conversion = aiAgentScoringService.canConvert({
      config: agentConfig,
      lead: updatedLead || lead,
      score,
    });
    let converted = false;
    if (conversion.ok && lead.id) {
      const marked = await aiAgentToolsService.markConverted(
        job.accountId,
        String(lead.id || lead._id),
        agentConfig.scoring.convertedStage || "converted",
      );
      converted = Boolean(marked);
      if (converted) tools.push("mark_converted");
    }

    if (
      converted ||
      aiAgentScoringService.meetsLevel(agentConfig, score.level, agentConfig.scoring.notifyFromLevel || "HOT")
    ) {
      const eventKey = converted ? "converted" : `score:${score.level}`;
      await aiAgentToolsService.notifyLeadEvent({
        organizationId: job.organizationId,
        accountId: job.accountId,
        conversationId: job.conversationId,
        eventKey,
        typeId: converted
          ? `ai-converted:${job.conversationId}`
          : `ai-score:${job.conversationId}:${score.level}`,
        title: converted ? "Lead converted" : `High priority lead (${score.level})`,
        description: [
          `${lead.name || job.phone}`,
          job.phone,
          `Intent: ${decision.intent || "n/a"}`,
          `Score: ${score.score}`,
          score.factors.slice(0, 4).join(", "),
        ]
          .filter(Boolean)
          .join(" · "),
        lead: updatedLead || lead,
        meta: { score, intent: decision.intent, phone: job.phone },
      });
      tools.push("notify_admin");
    }

    await WhatsAppAiAgentStateModel.updateOne(
      { conversationId: job.conversationId },
      {
        $set: {
          contactId: (contact as any)?.id || (contact as any)?._id || null,
          leadId: lead.id || null,
          currentIntent: decision.intent || "",
          buyingStage: decision.buyingStage || "",
          requirements: qualificationUpdates,
          missingFields,
          leadScore: score.score,
          leadScoreLevel: score.level,
          lastAction: actions[actions.length - 1] || "",
          pendingAction: missingFields[0] || "",
        },
      },
    );

    if (!liveChat.autoResolveActive) {
      await whatsAppAiAgentService.startConversation(job.organizationId).catch((error) =>
        logger.warn("WHATSAPP_AI_AGENT_USAGE_SKIPPED", { error: (error as Error).message }),
      );
    }

    logger.info("WHATSAPP_AI_AGENT_COMPLETED", {
      conversationId: job.conversationId,
      messageId: job.messageId,
      intent: decision.intent,
      score: score.score,
      level: score.level,
      escalated: shouldEscalate,
      converted,
    });

    return {
      intent: decision.intent,
      actions,
      tools,
      knowledgeIds: knowledge.map((item) => item.id),
      score: score.score,
      level: score.level,
      escalated: shouldEscalate,
      converted,
    };
  }

  private async executeSend(
    action: { name: string; args?: Record<string, any> },
    ctx: Parameters<typeof aiAgentToolsService.sendText>[0],
    lead: any,
  ) {
    const args = action.args || {};
    switch (action.name) {
      case "send_text":
        return aiAgentToolsService.sendText(ctx, args.text || args.body || "");
      case "send_canned_message":
      case "send_carousel":
        return aiAgentToolsService.sendCanned(
          ctx,
          String(args.id || args.shortcut || args.name || ""),
          lead,
        );
      case "send_template":
        return aiAgentToolsService.sendTemplate(ctx, String(args.name || args.templateName || ""), args.language);
      case "send_image":
        return aiAgentToolsService.sendExistingMedia(
          ctx,
          "image",
          String(args.id || args.name || args.hint || ""),
          lead,
        );
      case "send_video":
        return aiAgentToolsService.sendExistingMedia(
          ctx,
          "video",
          String(args.id || args.name || args.hint || ""),
          lead,
        );
      case "send_document":
        return aiAgentToolsService.sendExistingMedia(
          ctx,
          "document",
          String(args.id || args.name || args.hint || ""),
          lead,
        );
      default:
        return { skipped: true };
    }
  }

  private async reason(params: {
    config: WhatsAppAiAgentConfig;
    inbound: string;
    transcript: { from: string; text: string; type: string }[];
    knowledge: { id: string; title: string; content: string }[];
    assets: { canned: any[]; templates: any[] };
    lead: any;
    state: any;
  }): Promise<AgentDecision> {
    const { config } = params;
    const fields = (config.qualificationFields || [])
      .map((item) => `${item.key} (${item.label}${item.required ? ", required" : ""})`)
      .join(", ");

    const system = `${config.instructions || DEFAULT_AGENT_INSTRUCTIONS}

Business: ${config.businessProfile?.name || "this business"}
${config.businessProfile?.description || ""}

Return ONLY compact JSON. First key MUST be replyText:
{"replyText":"short WhatsApp reply","intent":"KEY","actions":[{"name":"send_text","args":{"text":""}}],"escalate":false,"escalateReason":"","confidence":0-1,"informationUnavailable":false,"qualificationUpdates":{},"requestedDiscountPercent":null,"buyingStage":"awareness|consideration|intent|decision"}

Rules:
- Keep replyText to 1-3 short WhatsApp lines.
- Never invent prices, availability, discounts, or facts missing from knowledge.
- Use only listed canned/templates/media.
- Ask at most two questions.
- If knowledge lacks the answer, set informationUnavailable=true.
- If they ask for a human, escalate.
- Max discount ${config.discount?.maximumPercent ?? 0}%.
- Do not expose CRM internals.`;

    const user = JSON.stringify({
      inbound: params.inbound,
      intents: (config.intents || []).map((item) => item.key).join(","),
      fields,
      lead: {
        name: params.lead?.name,
        phone: params.lead?.phone,
        fields: params.lead?.customFields,
      },
      missing: params.state?.missingFields,
      knowledge: params.knowledge,
      assets: params.assets,
      transcript: params.transcript.slice(-6),
    });

    try {
      const raw = await this.generate(`${system}\n\n${user}`);
      const parsed = parseJson(raw || "");
      if (parsed?.replyText || parsed?.actions?.length || parsed?.escalate) return parsed as AgentDecision;
    } catch (error) {
      logger.warn("WHATSAPP_AI_AGENT_LLM_FALLBACK", {
        error: (error as Error).message,
      });
    }

    return {
      intent: "GENERAL_QUERY",
      replyText: "Thanks for your message. Could you share a bit more about what you need?",
      confidence: 0.3,
      informationUnavailable: !params.knowledge.length,
      actions: [],
    };
  }

  private async generate(prompt: string) {
    return aiAgentLlmService.generate(prompt);
  }
}

export const whatsappAiSalesAgentService = new WhatsAppAiSalesAgentService();
