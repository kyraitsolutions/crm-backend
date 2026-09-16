import { Types } from "mongoose";
import { emailService, notificationService } from "../../../../container.js";
import { ENV } from "../../../../constants/index.js";
import { AccountModel } from "../../../../models/accounts.model.js";
import { ConversationModel } from "../../../../models/conversations.model.js";
import { LeadModel } from "../../../../models/lead.model.js";
import { Notification } from "../../../../models/notification.model.js";
import { Task } from "../../../../models/tasks.model.js";
import { ContactRepository } from "../../../../repositories/contact.repository.js";
import logger from "../../../../utils/logger.js";
import { phoneMatchValues } from "../../../../utils/phone.util.js";
import { CANNED_MESSAGE_STATUS } from "../../canned/constants/canned.constant.js";
import { WhatsAppCannedMessageModel } from "../../canned/models/whatsapp-canned-message.model.js";
import { whatsappCannedMessageService } from "../../canned/services/whatsapp-canned-message.service.js";
import { WhatsappMessageService } from "../../messages/services/message.service.js";
import { WhatsappTemplateModel } from "../../templates/models/template.model.js";
import type { WhatsAppAiAgentConfig } from "../models/whatsapp-ai-agent-config.model.js";
import { WhatsAppAiAgentRunModel } from "../models/whatsapp-ai-agent-run.model.js";
import { WhatsAppAiAgentStateModel } from "../models/whatsapp-ai-agent-state.model.js";

type ToolContext = {
  organizationId: string;
  accountId: string;
  conversationId: string;
  phone: string;
  messageId: string;
  contactName?: string;
  businessName?: string;
};

const frontendBase = () =>
  String(ENV.URL.FRONTEND_URL || process.env.FRONTEND_URL || "https://crm.kyraitsolutions.com").replace(
    /\/$/,
    "",
  );

const whatsappInboxUrl = (accountId: string, conversationId?: string) => {
  const base = `${frontendBase()}/dashboard/account/${accountId}/live-chat?channel=whatsapp`;
  return conversationId ? `${base}&conversation=${conversationId}` : base;
};

const leadDetailUrl = (accountId: string, leadId?: string) => {
  if (!leadId) return "";
  return `${frontendBase()}/dashboard/account/${accountId}/leads/${leadId}/lead-details`;
};

const interpolate = (text: string, ctx: ToolContext, lead?: any) => {
  if (!text) return "";
  const name = String(lead?.name || ctx.contactName || "");
  const values: Record<string, string> = {
    customer_name: name,
    customer_phone: ctx.phone,
    customer_email: String(lead?.email || ""),
    agent_name: "Kyra",
    property_name: ctx.businessName || "",
    company_name: ctx.businessName || "",
    FirstName: name.split(/\s+/)[0] || "",
    Name: name,
    MobileNumber: ctx.phone,
  };
  return text
    .replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => values[key] ?? values[key.toLowerCase()] ?? "")
    .replace(/\$([a-zA-Z0-9_]+)/g, (_, key: string) => values[key] ?? "");
};

export class AiAgentToolsService {
  private whatsappMessageService = new WhatsappMessageService();
  private contactRepository = new ContactRepository();
  private assetsCache = new Map<string, { at: number; value: any }>();

  async findContact(accountId: string, phone: string, email?: string) {
    return this.contactRepository.findExistingContact(accountId, email, phone);
  }

  async findOrCreateLead(params: {
    accountId: string;
    organizationId: string;
    phone: string;
    name?: string;
    email?: string;
    inboundText?: string;
    conversationId?: string;
  }) {
    const phones = phoneMatchValues(params.phone);
    const existing = await LeadModel.findOne({
      accountId: params.accountId,
      isDeleted: { $ne: true },
      $or: [{ phone: { $in: phones } }, { mobile: { $in: phones } }],
    })
      .sort({ updatedAt: -1 })
      .lean();

    if (existing) {
      return { ...(existing as any), id: String(existing._id), isNew: false };
    }

    return {
      id: "",
      name: params.name || params.phone,
      phone: params.phone,
      mobile: params.phone,
      email: params.email || "",
      message: String(params.inboundText || "").slice(0, 2000),
      source: { name: "whatsapp" },
      isNew: false,
    };
  }

  async updateLeadFields(params: {
    accountId: string;
    leadId: string;
    fields: Record<string, unknown>;
    stage?: string;
    score?: { score: number; level: string; factors: string[] };
  }) {
    if (!params.leadId) return null;
    const $set: Record<string, unknown> = {};
    const reserved = new Set(["name", "email", "phone", "mobile", "company", "message", "description"]);
    for (const [rawKey, rawValue] of Object.entries(params.fields || {})) {
      const key = String(rawKey || "").trim();
      if (!key || key.includes(".")) continue;
      const value = this.scalarFieldValue(rawValue);
      if (value === "") continue;
      if (reserved.has(key)) $set[key] = value;
      else $set[`customFields.${key}`] = value;
    }
    if (params.stage) $set.stage = params.stage;
    if (params.score) {
      $set.score = params.score.score;
      $set.scoreLevel = params.score.level;
      $set.scoreFactors = params.score.factors;
      $set.scoreUpdatedAt = new Date();
    }
    if (!Object.keys($set).length) {
      return LeadModel.findOne({ _id: params.leadId, accountId: params.accountId }).lean();
    }
    return LeadModel.findOneAndUpdate(
      { _id: params.leadId, accountId: params.accountId },
      { $set },
      { new: true },
    ).lean();
  }

  async markConverted(accountId: string, leadId: string, stage: string) {
    if (!leadId) return null;
    return LeadModel.findOneAndUpdate(
      {
        _id: leadId,
        accountId,
        $or: [{ convertedAt: { $exists: false } }, { convertedAt: null }, { convertedAt: "" }],
      },
      {
        $set: {
          stage,
          convertedAt: new Date(),
          conversionSource: "whatsapp_ai_agent",
        },
      },
      { new: true },
    ).lean();
  }

  async listSendableAssets(accountId: string) {
    const cached = this.assetsCache.get(accountId);
    if (cached && Date.now() - cached.at < 30_000) return cached.value;

    const [canned, templates] = await Promise.all([
      WhatsAppCannedMessageModel.find({
        accountId,
        status: CANNED_MESSAGE_STATUS.PUBLISHED,
      })
        .select("name shortcut type text category media.url media.fileName")
        .lean(),
      WhatsappTemplateModel.find({ accountId, status: "APPROVED" })
        .select("name language category")
        .lean(),
    ]);

    const value = {
      canned: canned.map((item) => ({
        id: String(item._id),
        name: item.name,
        shortcut: item.shortcut,
        type: item.type,
        preview: String(item.text || "").slice(0, 100),
        category: item.category,
        hasMedia: Boolean(item.media?.url),
      })),
      templates: templates.map((item) => ({
        id: String(item._id),
        name: item.name,
        language: item.language,
        category: item.category,
      })),
    };
    this.assetsCache.set(accountId, { at: Date.now(), value });
    return value;
  }

  async sendTypingIndicator(accountId: string, inboundMessageId: string) {
    const messageId = String(inboundMessageId || "");
    if (!messageId || messageId.startsWith("resume:")) return;
    await this.whatsappMessageService
      .sendTypingIndicator(accountId, messageId)
      .catch((error) =>
        logger.warn("WHATSAPP_TYPING_SKIPPED", { error: (error as Error).message }),
      );
  }

  async sendText(ctx: ToolContext, body: string) {
    const text = String(body || "").trim();
    if (!text) return { skipped: true, reason: "empty_text" };
    await this.whatsappMessageService.send(ctx.accountId, {
      type: "text",
      to: ctx.phone,
      source: "automation",
      text: { body: text.slice(0, 4000) },
    });
    await this.markOutbound(ctx);
    return { sent: "text" };
  }

  async sendCanned(ctx: ToolContext, idOrShortcut: string, lead?: any) {
    const cannedFilter: Record<string, unknown>[] = [
      { shortcut: String(idOrShortcut).replace(/^\/+/, "").toLowerCase() },
      { name: new RegExp(`^${this.escapeRegex(idOrShortcut)}$`, "i") },
    ];
    if (Types.ObjectId.isValid(idOrShortcut)) cannedFilter.push({ _id: idOrShortcut });

    const canned = await WhatsAppCannedMessageModel.findOne({
      accountId: ctx.accountId,
      status: CANNED_MESSAGE_STATUS.PUBLISHED,
      $or: cannedFilter,
    });
    if (!canned) return { skipped: true, reason: "canned_not_found" };

    const caption = interpolate(canned.text || "", ctx, lead);
    if (canned.type === "text") {
      await this.sendText(ctx, caption);
    } else if (canned.media?.url) {
      const type = ["image", "video", "document", "audio"].includes(canned.type)
        ? canned.type
        : "image";
      await this.whatsappMessageService.send(ctx.accountId, {
        type,
        to: ctx.phone,
        source: "automation",
        [type]: {
          link: canned.media.url,
          caption,
          filename: canned.media.fileName,
        },
      });
      await this.markOutbound(ctx);
    } else {
      return { skipped: true, reason: "canned_media_missing" };
    }

    await whatsappCannedMessageService.markUsed(ctx.accountId, String(canned._id)).catch(() => null);
    return { sent: canned.type, cannedId: String(canned._id) };
  }

  async sendTemplate(ctx: ToolContext, name: string, language?: string) {
    const template = await WhatsappTemplateModel.findOne({
      accountId: ctx.accountId,
      status: "APPROVED",
      name: String(name || "").toLowerCase().trim(),
    });
    if (!template) return { skipped: true, reason: "template_not_found" };
    await this.whatsappMessageService.send(ctx.accountId, {
      type: "template",
      to: ctx.phone,
      source: "automation",
      template: {
        name: template.name,
        language: { code: language || template.language || "en" },
        components: [],
      },
    });
    await this.markOutbound(ctx);
    return { sent: "template", name: template.name };
  }

  async sendExistingMedia(
    ctx: ToolContext,
    type: "image" | "video" | "document",
    hint: string,
    lead?: any,
  ) {
    const mediaFilter: Record<string, unknown>[] = [
      { name: new RegExp(this.escapeRegex(hint), "i") },
      { shortcut: String(hint).replace(/^\/+/, "").toLowerCase() },
      { "media.fileName": new RegExp(this.escapeRegex(hint), "i") },
    ];
    if (Types.ObjectId.isValid(hint)) mediaFilter.push({ _id: hint });

    const canned = await WhatsAppCannedMessageModel.findOne({
      accountId: ctx.accountId,
      status: CANNED_MESSAGE_STATUS.PUBLISHED,
      type,
      $or: mediaFilter,
    });
    if (!canned?.media?.url) return { skipped: true, reason: "media_asset_not_found" };
    await this.whatsappMessageService.send(ctx.accountId, {
      type,
      to: ctx.phone,
      source: "automation",
      [type]: {
        link: canned.media.url,
        caption: interpolate(canned.text || "", ctx, lead),
        filename: canned.media.fileName,
      },
    });
    await this.markOutbound(ctx);
    return { sent: type, cannedId: String(canned._id) };
  }

  async escalate(params: {
    ctx: ToolContext;
    config: WhatsAppAiAgentConfig;
    reason: string;
    lead?: any;
    score?: { score: number; level: string };
    message?: string;
    intent?: string;
  }) {
    const { ctx, reason, lead, score } = params;
    await ConversationModel.updateOne(
      { _id: ctx.conversationId, accountId: ctx.accountId },
      {
        $set: {
          "metadata.liveChat.humanIntervened": true,
          "metadata.liveChat.intervenedAt": new Date(),
          "metadata.liveChat.autoResolveActive": false,
          "metadata.liveChat.escalationReason": reason,
          status: "open",
        },
      },
    );

    await WhatsAppAiAgentStateModel.updateOne(
      { conversationId: ctx.conversationId, accountId: ctx.accountId },
      {
        $set: {
          "escalation.required": true,
          "escalation.reason": reason,
          "escalation.at": new Date(),
          lastAction: "escalate_to_human",
        },
      },
    );

    const who = lead?.name || ctx.contactName || ctx.phone;
    const notified = await this.notifyOnce({
      organizationId: ctx.organizationId,
      accountId: ctx.accountId,
      typeId: `ai-escalate:${ctx.conversationId}`,
      eventKey: "escalated",
      conversationId: ctx.conversationId,
      title: "Human follow-up required",
      description: `${who} · ${reason}${score ? ` · Score ${score.score}` : ""}`,
      meta: { reason, phone: ctx.phone, leadId: lead?.id, score },
    });

    if (notified) {
      await this.queueWhatsAppEscalationEmail({
        accountId: ctx.accountId,
        conversationId: ctx.conversationId,
        lead,
        phone: ctx.phone,
        name: who,
        reason,
        score,
        message: params.message,
        intent: params.intent,
      });
    }

    await ConversationModel.updateOne(
      { _id: ctx.conversationId, accountId: ctx.accountId },
      {
        $push: {
          followUps: {
            note: reason,
            dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            createdAt: new Date(),
          },
        },
      },
    );

    await this.createFollowUpTask({
      organizationId: ctx.organizationId,
      accountId: ctx.accountId,
      conversationId: ctx.conversationId,
      title: `WhatsApp follow-up: ${who}`,
      description: reason,
    });

    return { escalated: true, reason };
  }

  async notifyLeadEvent(params: {
    organizationId: string;
    accountId: string;
    conversationId: string;
    eventKey: string;
    typeId: string;
    title: string;
    description: string;
    lead?: any;
    meta?: Record<string, unknown>;
  }) {
    await this.notifyOnce(params);
  }

  private async notifyOnce(params: {
    organizationId: string;
    accountId: string;
    conversationId?: string;
    eventKey: string;
    typeId: string;
    title: string;
    description: string;
    lead?: any;
    meta?: Record<string, unknown>;
  }) {
    if (params.conversationId) {
      const claimed = await WhatsAppAiAgentStateModel.updateOne(
        {
          conversationId: params.conversationId,
          notifiedEvents: { $ne: params.eventKey },
        },
        { $addToSet: { notifiedEvents: params.eventKey } },
      );
      if (!claimed.modifiedCount && !claimed.upsertedCount) return null;
    }

    const existing = await Notification.findOne({
      organizationId: params.organizationId,
      type: "system_alert",
      typeId: params.typeId,
    }).select("_id");
    if (existing) return null;

    return notificationService.notify({
      organizationId: params.organizationId,
      accountId: params.accountId,
      typeId: params.typeId,
      type: "system_alert",
      channelType: "whatsapp",
      title: params.title,
      description: params.description,
      meta: params.meta,
    });
  }

  private async queueWhatsAppLeadEmail(params: {
    accountId: string;
    conversationId?: string;
    lead: any;
    message?: string;
  }) {
    const account = await AccountModel.findById(params.accountId).select("email accountName");
    if (!account?.email) return;
    const leadId = String(params.lead?.id || params.lead?._id || "");
    await emailService
      .queueLeadNotificationEmail({
        email: String(account.email),
        lead: {
          name: params.lead?.name || params.lead?.phone,
          phone: params.lead?.phone || params.lead?.mobile,
          email: params.lead?.email,
          message: String(params.message || params.lead?.message || "").slice(0, 800),
          source: { name: "whatsapp" },
          accountName: account.accountName,
          inboxUrl: whatsappInboxUrl(params.accountId, params.conversationId),
          leadUrl: leadDetailUrl(params.accountId, leadId),
          receivedAt: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        },
      })
      .catch((error) =>
        logger.warn("WHATSAPP_NEW_LEAD_EMAIL_SKIPPED", { error: (error as Error).message }),
      );
  }

  private async queueWhatsAppEscalationEmail(params: {
    accountId: string;
    conversationId: string;
    lead?: any;
    phone: string;
    name: string;
    reason: string;
    score?: { score: number; level: string };
    message?: string;
    intent?: string;
  }) {
    const account = await AccountModel.findById(params.accountId).select("email accountName");
    if (!account?.email) return;
    const leadId = String(params.lead?.id || params.lead?._id || "");
    const scoreLabel = params.score
      ? `${params.score.level} · ${params.score.score}`
      : "";
    await emailService
      .queueWhatsAppEscalationEmail({
        email: String(account.email),
        data: {
          leadName: params.name,
          leadPhone: params.lead?.phone || params.phone,
          leadEmail: params.lead?.email || "",
          reason: params.reason,
          scoreLabel,
          intent: params.intent || "",
          message: String(params.message || "").slice(0, 800),
          inboxUrl: whatsappInboxUrl(params.accountId, params.conversationId),
          leadUrl: leadDetailUrl(params.accountId, leadId),
        },
      })
      .catch((error) =>
        logger.warn("WHATSAPP_ESCALATION_EMAIL_SKIPPED", { error: (error as Error).message }),
      );
  }

  private async createFollowUpTask(params: {
    organizationId: string;
    accountId: string;
    conversationId: string;
    title: string;
    description: string;
  }) {
    const entityType = "conversation";
    const entityId = params.conversationId;
    const existing = await Task.findOne({
      accountId: params.accountId,
      entityType,
      entityId,
      status: { $in: ["pending", "in_progress"] },
      "source.type": "automation",
    }).select("_id");
    if (existing) return existing;
    return Task.create({
      organizationId: params.organizationId,
      accountId: params.accountId,
      title: params.title,
      description: params.description,
      status: "pending",
      priority: "high",
      entityType,
      entityId,
      source: { type: "automation" },
    });
  }

  private async markOutbound(ctx: ToolContext) {
    await Promise.all([
      WhatsAppAiAgentRunModel.updateOne(
        { messageId: ctx.messageId },
        { $set: { outboundSent: true } },
      ),
      WhatsAppAiAgentStateModel.updateOne(
        { conversationId: ctx.conversationId },
        { $set: { lastOutboundAt: new Date() } },
      ),
    ]);
  }

  private escapeRegex(value: string) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private scalarFieldValue(value: unknown): string {
    if (value === undefined || value === null) return "";
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return String(value).trim();
    }
    if (typeof value === "object") {
      const record = value as Record<string, unknown>;
      const nested =
        record.phone ||
        record.number ||
        record.value ||
        record.text ||
        record.email ||
        record.name;
      return nested ? this.scalarFieldValue(nested) : "";
    }
    return "";
  }
}

export const aiAgentToolsService = new AiAgentToolsService();
