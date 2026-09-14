import { Types } from "mongoose";
import { FEATURE } from "../../../../constants/subscription.constant.js";
import { AccountModel } from "../../../../models/accounts.model.js";
import { ConversationModel } from "../../../../models/conversations.model.js";
import { ChatFlow } from "../../../../models/chatflow.model.js";
import { SubscriptionService } from "../../../../services/subscription.service.js";
import { whatsAppAiAgentService } from "../../../../services/whatsapp-ai-agent.service.js";
import { HttpError } from "../../../../utils/http.error.js";
import logger from "../../../../utils/logger.js";
import { WhatsappMessageService } from "../../messages/services/message.service.js";
import { WhatsappTemplateModel } from "../../templates/models/template.model.js";
import {
  AUTO_REPLY_TYPE,
  AUTO_RESOLVE_MODE,
  AUTO_RESOLVE_SCHEDULE,
  DEFAULT_OFF_HOURS_TEXT,
  DEFAULT_WELCOME_TEXT,
  DEFAULT_WORKING_HOURS,
} from "../constants/live-chat.constant.js";
import { UpdateWhatsAppLiveChatDto } from "../dtos/live-chat.dto.js";
import { WhatsAppLiveChatSettingsModel } from "../models/whatsapp-live-chat-settings.model.js";
import { isWithinWorkingHours } from "../utils/working-hours.util.js";

type AutoReply = {
  enabled?: boolean;
  type?: string;
  text?: string;
  templateId?: string | null;
  templateName?: string | null;
  language?: string | null;
};

export class WhatsAppLiveChatService {
  private subscriptionService = new SubscriptionService();
  private whatsappMessageService = new WhatsappMessageService();

  private serialize(settings: any) {
    if (!settings) return settings;
    return {
      ...settings,
      autoResolve: {
        ...settings.autoResolve,
        chatFlowId: settings.autoResolve?.chatFlowId
          ? String(settings.autoResolve.chatFlowId)
          : null,
        aiAgentId: settings.autoResolve?.aiAgentId || null,
      },
    };
  }

  async getSettings(organizationId: string, accountId: string) {
    const existing = await WhatsAppLiveChatSettingsModel.findOne({ accountId });
    if (existing) return this.serialize(existing.toJSON());

    const created = await WhatsAppLiveChatSettingsModel.create({
      organizationId,
      accountId,
      autoResolve: {
        enabled: false,
        mode: null,
        chatFlowId: null,
        aiAgentId: null,
        scheduleMode: AUTO_RESOLVE_SCHEDULE.WORKING_HOURS,
      },
      workingHours: DEFAULT_WORKING_HOURS,
      welcomeMessage: {
        enabled: false,
        type: AUTO_REPLY_TYPE.TEXT,
        text: DEFAULT_WELCOME_TEXT,
        templateId: null,
        templateName: null,
        language: "en",
      },
      offHoursMessage: {
        enabled: false,
        type: AUTO_REPLY_TYPE.TEXT,
        text: DEFAULT_OFF_HOURS_TEXT,
        templateId: null,
        templateName: null,
        language: "en",
      },
    });
    return this.serialize(created.toJSON());
  }

  async getContext(organizationId: string, accountId: string) {
    const settings = await this.getSettings(organizationId, accountId);
    const [flows, templates, canUseAiAgent] = await Promise.all([
      ChatFlow.find({
        accountId,
        isDeleted: { $ne: true },
      })
        .select("name status isPublished updatedAt")
        .sort({ updatedAt: -1 })
        .lean(),
      WhatsappTemplateModel.find({
        accountId,
        status: "APPROVED",
      })
        .select("name language category status")
        .sort({ updatedAt: -1 })
        .lean(),
      this.subscriptionService
        .canAccessFeature(organizationId, FEATURE.WHATSAPP_AI_AGENT)
        .catch(() => false),
    ]);

    const aiAgentId = settings.autoResolve?.aiAgentId || null;

    return {
      settings,
      flows: flows.map((flow) => ({
        id: String(flow._id),
        name: flow.name,
        status: flow.status,
        isPublished: Boolean(flow.isPublished || flow.status === "published"),
      })),
      templates: templates.map((template) => ({
        id: String(template._id),
        name: template.name,
        language: template.language,
        category: template.category,
        status: template.status,
      })),
      aiAgent: {
        configured: Boolean(aiAgentId) || Boolean(canUseAiAgent),
        id: aiAgentId,
        available: Boolean(canUseAiAgent),
      },
    };
  }

  async updateSettings(
    organizationId: string,
    accountId: string,
    payload: UpdateWhatsAppLiveChatDto,
  ) {
    const current = await this.getSettings(organizationId, accountId);
    const nextAutoResolve = {
      enabled: payload.autoResolve?.enabled ?? current.autoResolve.enabled,
      mode:
        payload.autoResolve?.mode !== undefined
          ? payload.autoResolve.mode
          : current.autoResolve.mode,
      chatFlowId:
        payload.autoResolve?.chatFlowId !== undefined
          ? payload.autoResolve.chatFlowId
          : current.autoResolve.chatFlowId,
      aiAgentId:
        payload.autoResolve?.aiAgentId !== undefined
          ? payload.autoResolve.aiAgentId
          : current.autoResolve.aiAgentId,
      scheduleMode:
        payload.autoResolve?.scheduleMode ?? current.autoResolve.scheduleMode,
    };

    if (nextAutoResolve.enabled) {
      await this.assertAutoResolveReady(organizationId, accountId, {
        mode: nextAutoResolve.mode,
        chatFlowId: nextAutoResolve.chatFlowId
          ? String(nextAutoResolve.chatFlowId)
          : null,
        aiAgentId: nextAutoResolve.aiAgentId,
      });
    }

    const next = {
      autoResolve: {
        ...nextAutoResolve,
        chatFlowId: nextAutoResolve.chatFlowId || null,
        aiAgentId: nextAutoResolve.aiAgentId || null,
      },
      workingHours: payload.workingHours
        ? {
            timezone: payload.workingHours.timezone || current.workingHours.timezone,
            days: payload.workingHours.days?.length
              ? payload.workingHours.days
              : current.workingHours.days,
          }
        : current.workingHours,
      welcomeMessage: this.mergeReply(current.welcomeMessage, payload.welcomeMessage),
      offHoursMessage: this.mergeReply(
        current.offHoursMessage,
        payload.offHoursMessage,
      ),
    };

    const updated = await WhatsAppLiveChatSettingsModel.findOneAndUpdate(
      { accountId },
      { $set: { organizationId, ...next } },
      { new: true, upsert: true },
    );
    return this.serialize(updated?.toJSON());
  }

  async handleInbound(params: {
    accountId: string;
    organizationId?: string;
    conversationId: string;
    phone: string;
  }) {
    const organizationId =
      params.organizationId ||
      (await this.resolveOrganizationId(params.accountId));
    if (!organizationId) {
      logger.warn("WHATSAPP_LIVE_CHAT_SKIPPED", {
        reason: "missing_organization",
        accountId: params.accountId,
      });
      return null;
    }

    const settings = await this.getSettings(organizationId, params.accountId);
    const conversation = await ConversationModel.findById(params.conversationId);
    if (!conversation) {
      logger.warn("WHATSAPP_LIVE_CHAT_SKIPPED", {
        reason: "conversation_not_found",
        conversationId: params.conversationId,
      });
      return null;
    }

    const liveChat = {
      ...(((conversation.metadata as Record<string, any> | undefined)?.liveChat ||
        {}) as Record<string, any>),
    };

    const withinHours = isWithinWorkingHours(settings.workingHours);
    const autoActive =
      Boolean(settings.autoResolve?.enabled) &&
      !liveChat.humanIntervened &&
      this.matchesAutoResolveWindow(settings.autoResolve?.scheduleMode, withinHours);

    if (autoActive) {
      return this.attachAutoResolve({
        organizationId,
        conversation,
        settings,
        liveChat,
      });
    }

    const reply: AutoReply = withinHours
      ? settings.welcomeMessage
      : settings.offHoursMessage;
    const flag = withinHours ? "welcomeSentAt" : "offHoursSentAt";
    const flagPath = `metadata.liveChat.${flag}`;
    if (!reply?.enabled) {
      logger.info("WHATSAPP_LIVE_CHAT_SKIPPED", {
        reason: withinHours ? "welcome_disabled" : "off_hours_disabled",
        withinHours,
        conversationId: params.conversationId,
      });
      return null;
    }
    if (liveChat[flag]) {
      logger.info("WHATSAPP_LIVE_CHAT_SKIPPED", {
        reason: "already_sent",
        flag,
        conversationId: params.conversationId,
      });
      return null;
    }

    const claimed = await ConversationModel.updateOne(
      {
        _id: conversation._id,
        $or: [{ [flagPath]: { $exists: false } }, { [flagPath]: null }],
      },
      { $set: { [flagPath]: new Date() } },
    );
    if (!claimed.matchedCount) {
      logger.info("WHATSAPP_LIVE_CHAT_SKIPPED", {
        reason: "already_sent",
        flag,
        conversationId: params.conversationId,
      });
      return null;
    }

    const sent = await this.sendAutoReply(params.accountId, params.phone, reply);
    if (!sent) {
      await ConversationModel.updateOne(
        { _id: conversation._id },
        { $unset: { [flagPath]: 1 } },
      );
      return null;
    }

    logger.info("WHATSAPP_LIVE_CHAT_AUTOREPLY_SENT", {
      accountId: params.accountId,
      phone: params.phone,
      withinHours,
      type: reply.type,
    });
    return {
      action: withinHours ? ("welcome" as const) : ("off_hours" as const),
    };
  }

  private async resolveOrganizationId(accountId: string) {
    const account = await AccountModel.findById(accountId).select("organizationId");
    return account?.organizationId ? String(account.organizationId) : "";
  }

  async markHumanIntervention(conversationId: string) {
    if (!conversationId) return;
    await ConversationModel.findByIdAndUpdate(conversationId, {
      $set: {
        "metadata.liveChat.humanIntervened": true,
        "metadata.liveChat.intervenedAt": new Date(),
      },
    });
  }

  private matchesAutoResolveWindow(
    scheduleMode: string | undefined,
    withinHours: boolean,
  ) {
    if (scheduleMode === AUTO_RESOLVE_SCHEDULE.ALWAYS) return true;
    if (scheduleMode === AUTO_RESOLVE_SCHEDULE.OFF_HOURS) return !withinHours;
    return withinHours;
  }

  private async attachAutoResolve(params: {
    organizationId: string;
    conversation: any;
    settings: any;
    liveChat: Record<string, any>;
  }) {
    const { conversation, settings, liveChat, organizationId } = params;
    const mode = settings.autoResolve.mode;
    const alreadyAttached = Boolean(liveChat.autoResolveActive);

    liveChat.autoResolveActive = true;
    liveChat.mode = mode;
    liveChat.chatFlowId = settings.autoResolve.chatFlowId || null;
    liveChat.aiAgentId = settings.autoResolve.aiAgentId || null;
    liveChat.attachedAt = liveChat.attachedAt || new Date();

    const identifiers = {
      ...(conversation.identifiers || {}),
    };
    if (mode === AUTO_RESOLVE_MODE.FLOW && settings.autoResolve.chatFlowId) {
      identifiers.chatFlowId = settings.autoResolve.chatFlowId;
    }
    if (mode === AUTO_RESOLVE_MODE.AI_AGENT) {
      identifiers.aiAgentId = settings.autoResolve.aiAgentId;
      if (!alreadyAttached) {
        try {
          await whatsAppAiAgentService.startConversation(organizationId);
        } catch (error) {
          logger.warn("WHATSAPP_LIVE_CHAT_AI_USAGE_SKIPPED", {
            organizationId,
            conversationId: String(conversation._id),
            error: (error as Error).message,
          });
        }
      }
    }

    await ConversationModel.updateOne(
      { _id: conversation._id },
      {
        $set: {
          identifiers,
          "metadata.liveChat": liveChat,
        },
      },
    );
    return { action: "auto_resolve" as const, mode };
  }

  private async assertAutoResolveReady(
    organizationId: string,
    accountId: string,
    autoResolve: {
      mode: string | null;
      chatFlowId?: string | null;
      aiAgentId?: string | null;
    },
  ) {
    if (autoResolve.mode === AUTO_RESOLVE_MODE.FLOW) {
      if (!autoResolve.chatFlowId) {
        throw HttpError.badRequest("Create and select a chatflow before enabling auto resolve");
      }
      const flow = await ChatFlow.findOne({
        _id: autoResolve.chatFlowId,
        accountId,
        isDeleted: { $ne: true },
      });
      if (!flow) throw HttpError.badRequest("Selected chatflow was not found");
      if (!(flow.isPublished || flow.status === "published")) {
        throw HttpError.badRequest("Publish the chatflow before enabling auto resolve");
      }
      return;
    }

    if (autoResolve.mode === AUTO_RESOLVE_MODE.AI_AGENT) {
      try {
        await this.subscriptionService.checkFeature(
          organizationId,
          FEATURE.WHATSAPP_AI_AGENT,
        );
      } catch (error) {
        const err = error as HttpError;
        throw HttpError.forbidden(
          err.message || "WhatsApp AI Agent is available on upgraded plans",
          err.details,
        );
      }
      return;
    }

    throw HttpError.badRequest("Select a flow or AI agent before enabling auto resolve");
  }

  private mergeReply(current: AutoReply, incoming?: AutoReply) {
    if (!incoming) return current;
    const next = {
      enabled: incoming.enabled ?? current.enabled,
      type: incoming.type ?? current.type ?? AUTO_REPLY_TYPE.TEXT,
      text: incoming.text ?? current.text ?? "",
      templateId:
        incoming.templateId !== undefined ? incoming.templateId : current.templateId,
      templateName:
        incoming.templateName !== undefined
          ? incoming.templateName
          : current.templateName,
      language: incoming.language ?? current.language ?? "en",
    };
    if (next.enabled) this.assertReplyReady(next);
    return next;
  }

  private assertReplyReady(reply: AutoReply) {
    if (reply.type === AUTO_REPLY_TYPE.TEMPLATE) {
      if (!reply.templateId && !reply.templateName) {
        throw HttpError.badRequest("Select a WhatsApp template for this auto reply");
      }
      return;
    }
    if (!String(reply.text || "").trim()) {
      throw HttpError.badRequest("Enter a text message for this auto reply");
    }
  }

  private async sendAutoReply(accountId: string, to: string, reply: AutoReply) {
    try {
      if (reply.type === AUTO_REPLY_TYPE.TEMPLATE) {
        const template = await this.resolveTemplate(accountId, reply);
        await this.whatsappMessageService.send(accountId, {
          type: "template",
          to,
          source: "automation",
          template: {
            name: template.name,
            language: { code: template.language || reply.language || "en" },
            components: [],
          },
        });
        return true;
      }

      await this.whatsappMessageService.send(accountId, {
        type: "text",
        to,
        source: "automation",
        text: { body: String(reply.text || "").trim() },
      });
      return true;
    } catch (error) {
      logger.error("WHATSAPP_LIVE_CHAT_AUTOREPLY_FAILED", {
        accountId,
        to,
        error: (error as Error).message,
      });
      return false;
    }
  }

  private async resolveTemplate(accountId: string, reply: AutoReply) {
    const filter: Record<string, unknown> = {
      accountId,
      status: "APPROVED",
    };
    if (reply.templateId && Types.ObjectId.isValid(reply.templateId)) {
      filter._id = reply.templateId;
    } else if (reply.templateName) {
      filter.name = reply.templateName;
    }
    const template = await WhatsappTemplateModel.findOne(filter);
    if (!template) {
      throw new Error("Approved template not found for auto reply");
    }
    return template;
  }
}

export const whatsappLiveChatService = new WhatsAppLiveChatService();
