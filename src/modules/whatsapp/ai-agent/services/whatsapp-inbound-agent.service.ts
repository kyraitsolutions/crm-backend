import { ConversationModel } from "../../../../models/conversations.model.js";
import { MessageModel } from "../../../../models/messages.model.js";
import { FEATURE } from "../../../../constants/subscription.constant.js";
import { SubscriptionService } from "../../../../services/subscription.service.js";
import { whatsAppAiAgentService } from "../../../../services/whatsapp-ai-agent.service.js";
import { HttpError } from "../../../../utils/http.error.js";
import logger from "../../../../utils/logger.js";
import {
  AI_AGENT_CHANNEL,
  HUMAN_REQUEST_PHRASES,
} from "../../../ai-agent/runtime/constants/runtime.constant.js";
import { aiAgentRuntimeService } from "../../../ai-agent/runtime/services/ai-agent-runtime.service.js";
import type { TRuntimeMessage } from "../../../ai-agent/runtime/types/runtime.type.js";
import { AUTO_RESOLVE_MODE } from "../../live-chat/constants/live-chat.constant.js";
import { WhatsAppLiveChatSettingsModel } from "../../live-chat/models/whatsapp-live-chat-settings.model.js";
import { matchesAutoResolveWindow } from "../../live-chat/utils/auto-resolve.util.js";
import { isWithinWorkingHours } from "../../live-chat/utils/working-hours.util.js";
import type { WhatsAppAiAgentJobData } from "../../../../queue/whatsapp/ai-agent.queue.js";
import { WhatsAppAiAgentRunModel } from "../models/whatsapp-ai-agent-run.model.js";

type AiAgentJob = WhatsAppAiAgentJobData;

type InboundResult = {
  skipped: boolean;
  reason?: string;
  intent?: string;
  actions?: string[];
  tools?: string[];
  knowledgeIds?: string[];
  escalated?: boolean;
};

const INTERACTIVE_TYPES = new Set(["button", "list", "cta_url", "carousel"]);

export class WhatsAppInboundAgentService {
  private subscriptionService = new SubscriptionService();

  async handleIncoming(job: AiAgentJob) {
    console.log("handleIncoming", job);
    // console.log("job.inboundText", job.inboundText);
    const started = Date.now();
    const claimed = await this.claimRun(job);
    
    if (!claimed) return { skipped: true, reason: "already_processed" };

    try {
      const result = await this.reply(job);
      await WhatsAppAiAgentRunModel.updateOne(
        { messageId: job.messageId },
        {
          $set: {
            status: result.skipped ? "skipped" : "completed",
            intent: result.intent || "",
            selectedActions: result.actions || [],
            toolsExecuted: result.tools || [],
            knowledgeIds: result.knowledgeIds || [],
            escalated: Boolean(result.escalated),
            latencyMs: Date.now() - started,
            completedAt: new Date(),
            error: result.skipped ? result.reason || "" : "",
          },
        },
      );
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
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

  private async reply(job: AiAgentJob): Promise<InboundResult> {
    
    const conversation = await ConversationModel.findById(job.conversationId);
    if (!conversation) return { skipped: true, reason: "conversation_missing" };

    const liveChat = (conversation.metadata as { liveChat?: Record<string, unknown> })
      ?.liveChat || {};
    if (liveChat.humanIntervened || liveChat.escalationReason) {
      return { skipped: true, reason: "human_required" };
    }

    const [settings, canUse] = await Promise.all([
      WhatsAppLiveChatSettingsModel.findOne({ accountId: job.accountId }).lean(),
      this.subscriptionService
        .canAccessFeature(job.organizationId, FEATURE.WHATSAPP_AI_AGENT)
        .catch(() => false),
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

    const runDoc = await WhatsAppAiAgentRunModel.findOne({ messageId: job.messageId }).select(
      "outboundSent",
    );
    if (runDoc?.outboundSent) {
      return { skipped: true, reason: "already_sent" };
    }

    await this.showTyping(job.accountId, job.messageId);

    const history = await this.history(job);
    let result;
    try {
      result = await aiAgentRuntimeService.invoke({
        organizationId: job.organizationId,
        accountId: job.accountId,
        userMessage: inbound,
        history,
        threadId: job.conversationId,
        channel: AI_AGENT_CHANNEL.WHATSAPP,
        allowWrites: true,
        phone: job.phone,
        contactName: job.contactName || "",
        selectionId: job.selectionId || "",
      });
      console.log("result", result); 
    } catch (error) {
      if (error instanceof HttpError && error.statusCode === 404) {
        return { skipped: true, reason: "agent_not_found" };
      }
      throw error;
    }


    const text = String(result.assistantMessage || "").trim();
    const interactive = this.interactivePayload(result.interactive);
    const sent = result.image?.link
      ? await this.sendImage(job, result.image.link, text)
      : interactive
        ? await this.sendInteractive(job, interactive, text)
        : await this.sendText(job, text);

    const customerAskedForPerson = HUMAN_REQUEST_PHRASES.some((phrase) =>
      inbound.toLowerCase().includes(phrase),
    );

    if (customerAskedForPerson) {
      await this.pauseForHuman(job, "Customer asked for a person").catch((error) =>
        logger.warn("WHATSAPP_AI_AGENT_HANDOFF_SKIPPED", {
          conversationId: job.conversationId,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }

    if (!liveChat.autoResolveActive) {
      await whatsAppAiAgentService
        .startConversation(job.organizationId)
        .catch((error) =>
          logger.warn("WHATSAPP_AI_AGENT_USAGE_SKIPPED", {
            error: error instanceof Error ? error.message : String(error),
          }),
        );
    }

    logger.info("WHATSAPP_AI_AGENT_COMPLETED", {
      conversationId: job.conversationId,
      messageId: job.messageId,
      intent: result.detectedIntent,
      route: result.routeTaken,
      interactive: Boolean(interactive && sent === "interactive"),
      handoff: result.shouldHandoff,
    });

    return {
      skipped: false,
      intent: result.detectedIntent || "",
      actions:
        sent === "none"
          ? []
          : [
              sent === "interactive"
                ? `send_${String(interactive?.type || "interactive")}`
                : "send_text",
            ],
      tools: (result.toolResults || []).map((tool) => tool.key),
      knowledgeIds: (result.retrievedChunks || []).map((chunk) => chunk.id),
      escalated: result.shouldHandoff,
      reason: "",
    };
  }

  private async history(job: AiAgentJob): Promise<TRuntimeMessage[]> {
    const messages = await MessageModel.find({ conversationId: job.conversationId })
      .sort({ createdAt: -1 })
      .limit(8)
      .select("from searchText body.text messageId")
      .lean();

    return messages
      .reverse()
      .filter((message) => message.messageId !== job.messageId)
      .map((message) => ({
        role: message.from === "user" ? ("user" as const) : ("assistant" as const),
        content: String(message.searchText || message.body?.text || "").trim(),
      }))
      .filter((message) => message.content);
  }

  private interactivePayload(value: Record<string, unknown> | null) {
    if (!value || typeof value !== "object") return null;
    const type = String(value.type || "");
    if (!INTERACTIVE_TYPES.has(type)) return null;
    return value;
  }

  private async sendInteractive(
    job: AiAgentJob,
    interactive: Record<string, unknown>,
    fallbackText: string,
  ) {
    console.log("interactive", interactive);
    try {
      await this.messages().then((service) =>
        service.send(job.accountId, {
          type: "interactive",
          to: job.phone,
          source: "automation",
          from: "bot",
          interactive,
        }),
      );
      await this.markSent(job.messageId);
      return "interactive";
    } catch (error) {
      logger.warn("WHATSAPP_AI_AGENT_INTERACTIVE_FAILED", {
        conversationId: job.conversationId,
        messageId: job.messageId,
        error: error instanceof Error ? error.message : String(error),
      });
      await this.sendText(job, fallbackText);
      return "text";
    }
  }

  private async sendImage(job: AiAgentJob, link: string, caption: string) {
    try {
      await this.messages().then((service) =>
        service.send(job.accountId, {
          type: "image",
          to: job.phone,
          source: "automation",
          from: "bot",
          caption: caption.slice(0, 1024),
          image: { link },
        }),
      );
      await this.markSent(job.messageId);
      return "image";
    } catch (error) {
      logger.warn("WHATSAPP_AI_AGENT_IMAGE_FAILED", {
        conversationId: job.conversationId,
        messageId: job.messageId,
        error: error instanceof Error ? error.message : String(error),
      });
      await this.sendText(job, caption);
      return "text";
    }
  }

  private async sendText(job: AiAgentJob, body: string) {
    const text = String(body || "").trim();
    if (!text) return "none";
    await this.messages().then((service) =>
      service.send(job.accountId, {
        type: "text",
        to: job.phone,
        source: "automation",
        from: "bot",
        text: { body: text.slice(0, 4000) },
      }),
    );
    await this.markSent(job.messageId);
    return "text";
  }

  private async messages() {
    await import("../../live-chat/services/whatsapp-live-chat.service.js");
    const { WhatsappMessageService } = await import(
      "../../messages/services/message.service.js"
    );
    return new WhatsappMessageService();
  }

  private async showTyping(accountId: string, messageId: string) {
    await import("../../live-chat/services/whatsapp-live-chat.service.js");
    const { aiAgentToolsService } = await import("./ai-agent-tools.service.js");
    await aiAgentToolsService.sendTypingIndicator(accountId, messageId);
  }

  private async markSent(messageId: string) {
    await WhatsAppAiAgentRunModel.updateOne(
      { messageId },
      { $set: { outboundSent: true } },
    );
  }

  private async pauseForHuman(job: AiAgentJob, reason: string) {
    await ConversationModel.updateOne(
      { _id: job.conversationId, accountId: job.accountId },
      {
        $set: {
          "metadata.liveChat.humanIntervened": true,
          "metadata.liveChat.intervenedAt": new Date(),
          "metadata.liveChat.autoResolveActive": false,
          "metadata.liveChat.escalationReason": reason || "handoff",
        },
      },
    );
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
    } catch (error: unknown) {
      const code = (error as { code?: number })?.code;
      if (code !== 11000) throw error;
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
}

export const whatsappInboundAgentService = new WhatsAppInboundAgentService();
