import { ConversationModel } from "../../../../models/conversations.model.js";
import { MessageModel } from "../../../../models/messages.model.js";
import logger from "../../../../utils/logger.js";
import { WhatsAppLiveChatSettingsModel } from "../../live-chat/models/whatsapp-live-chat-settings.model.js";
import { AUTO_RESOLVE_MODE } from "../../live-chat/constants/live-chat.constant.js";
import { matchesAutoResolveWindow } from "../../live-chat/utils/auto-resolve.util.js";
import { isWithinWorkingHours } from "../../live-chat/utils/working-hours.util.js";
import { WhatsAppAiAgentStateModel } from "../models/whatsapp-ai-agent-state.model.js";
import { enqueueWhatsAppAiAgentJob } from "../../../../queue/index.js";
import { TConversation } from "../../../../types/conversation.type.js";
import type { WhatsAppAiAgentJobData } from "../../../../queue/whatsapp/ai-agent.queue.js";

export type AiAgentJob = WhatsAppAiAgentJobData;

export class WhatsAppAiSalesAgentService {
  async handleIncoming(job: AiAgentJob) {
    const { whatsappInboundAgentService } = await import(
      "./whatsapp-inbound-agent.service.js"
    );
    return whatsappInboundAgentService.handleIncoming(job);
  }

  async resumeConversation(params: {
    organizationId: string;
    accountId: string;
    conversationId: string;
  }) {
    const conversation: TConversation | null = await ConversationModel.findOne({
      _id: params.conversationId,
      accountId: params.accountId,
    });

    if (!conversation) return { resumed: false, reason: "conversation_missing" };

    const liveChat = (conversation.metadata as { liveChat?: Record<string, unknown> })
      ?.liveChat || {};
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
      Boolean(inboundText) &&
      (!lastOutbound ||
        new Date(lastInbound!.createdAt).getTime() >=
          new Date(lastOutbound.createdAt).getTime());

    if (!customerIsWaiting) {
      return { resumed: true, queued: false };
    }

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
}

export const whatsappAiSalesAgentService = new WhatsAppAiSalesAgentService();
