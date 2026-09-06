import { Types } from "mongoose";
import { QUEUE_JOBS } from "../../../../constants/queue-jobs.constant.js";
import { FEATURE, USAGE_METRIC } from "../../../../constants/subscription.constant.js";
import { ContactModel } from "../../../../models/contact.model.js";
import { IntegrationProvider } from "../../../../models/integration.model.js";
import { emailQueue } from "../../../../queue/queue.js";
import { ActivityLogService } from "../../../../services/activityLog.service.js";
import { SubscriptionService } from "../../../../services/subscription.service.js";
import { HttpError } from "../../../../utils/http.error.js";
import logger from "../../../../utils/logger.js";
import { buildPagination } from "../../../../utils/paginationBuilder.js";
import { WhatsAppAccountRepository } from "../../account/repositories/whatsapp-account.repository.js";
import { WhatsappMessageService } from "../../messages/services/message.service.js";
import { WhatsappTemplateModel } from "../../templates/models/template.model.js";
import {
  ALLOWED_WHATSAPP_CAMPAIGN_TRANSITIONS,
  DEFAULT_OPT_IN_KEYWORDS,
  DEFAULT_OPT_IN_MESSAGE,
  DEFAULT_OPT_OUT_KEYWORDS,
  DEFAULT_OPT_OUT_MESSAGE,
  MESSAGING_TIER_LIMIT,
  WHATSAPP_CAMPAIGN_BATCH_SIZE,
  WHATSAPP_CAMPAIGN_STATUS,
  WHATSAPP_RECIPIENT_STATUS,
  WHATSAPP_SEND_GAP_MS,
} from "../constants/broadcast.constant.js";
import { WhatsAppCampaignModel } from "../models/whatsapp-campaign.model.js";
import { WhatsAppCampaignRecipientModel } from "../models/whatsapp-campaign-recipient.model.js";
import { WhatsAppOptInSettingsModel } from "../models/whatsapp-optin-settings.model.js";
import {
  buildTemplateComponents,
  campaignRates,
  formatMessagingTier,
  matchesKeyword,
  toWhatsAppRecipient,
} from "../utils/broadcast.util.js";

const TWO_MONTHS_MS = 1000 * 60 * 60 * 24 * 61;

export class WhatsAppBroadcastService {
  private subscriptionService = new SubscriptionService();
  private activityLogService = new ActivityLogService();
  private whatsappAccountRepository = new WhatsAppAccountRepository();
  private whatsappMessageService = new WhatsappMessageService();

  private async assertFeature(organizationId: string) {
    try {
      await this.subscriptionService.checkFeature(
        organizationId,
        FEATURE.WHATSAPP_MESSAGING,
      );
    } catch (error) {
      const err = error as HttpError;
      throw HttpError.forbidden(
        err.message || "WhatsApp messaging is not available on your current plan.",
        err.details,
      );
    }
  }

  private assertTransition(from: string, to: string) {
    const allowed = ALLOWED_WHATSAPP_CAMPAIGN_TRANSITIONS[from] || [];
    if (!allowed.includes(to)) {
      throw HttpError.badRequest(`Cannot change campaign from ${from} to ${to}`);
    }
  }

  async getOptInSettings(organizationId: string, accountId: string) {
    const existing = await WhatsAppOptInSettingsModel.findOne({ accountId });
    if (existing) return existing.toJSON();
    const created = await WhatsAppOptInSettingsModel.create({
      organizationId,
      accountId,
      skipOptedOutCampaigns: true,
      optOut: {
        keywords: DEFAULT_OPT_OUT_KEYWORDS,
        autoReply: false,
        message: DEFAULT_OPT_OUT_MESSAGE,
      },
      optIn: {
        keywords: DEFAULT_OPT_IN_KEYWORDS,
        autoReply: false,
        message: DEFAULT_OPT_IN_MESSAGE,
      },
    });
    return created.toJSON();
  }

  async updateOptInSettings(
    organizationId: string,
    accountId: string,
    payload: Record<string, any>,
  ) {
    const current = await this.getOptInSettings(organizationId, accountId);
    const next = {
      skipOptedOutCampaigns:
        payload.skipOptedOutCampaigns ?? current.skipOptedOutCampaigns,
      optOut: {
        keywords: this.cleanKeywords(payload.optOut?.keywords ?? current.optOut.keywords),
        autoReply: payload.optOut?.autoReply ?? current.optOut.autoReply,
        message: payload.optOut?.message ?? current.optOut.message,
      },
      optIn: {
        keywords: this.cleanKeywords(payload.optIn?.keywords ?? current.optIn.keywords),
        autoReply: payload.optIn?.autoReply ?? current.optIn.autoReply,
        message: payload.optIn?.message ?? current.optIn.message,
      },
    };
    const updated = await WhatsAppOptInSettingsModel.findOneAndUpdate(
      { accountId },
      { $set: { organizationId, ...next } },
      { new: true, upsert: true },
    );
    return updated?.toJSON();
  }

  private cleanKeywords(keywords: unknown) {
    const list = Array.isArray(keywords) ? keywords : [];
    const unique = [...new Set(list.map((item) => String(item || "").trim()).filter(Boolean))];
    if (!unique.length) {
      throw HttpError.badRequest("Add at least one keyword");
    }
    return unique;
  }

  async handleInboundText(params: {
    accountId: string;
    organizationId?: string;
    phone: string;
    text: string;
  }) {
    const settingsDoc = await WhatsAppOptInSettingsModel.findOne({
      accountId: params.accountId,
    });
    if (!settingsDoc && !params.organizationId) return null;
    const settings = settingsDoc?.toJSON() || (await this.getOptInSettings(
      String(params.organizationId),
      params.accountId,
    ));
    const text = params.text || "";
    const optOutHit = matchesKeyword(text, settings.optOut?.keywords || []);
    const optInHit = matchesKeyword(text, settings.optIn?.keywords || []);
    if (!optOutHit && !optInHit) return null;

    const phone = toWhatsAppRecipient(params.phone);
    const contact = await ContactModel.findOne({
      accountId: params.accountId,
      $or: [{ phone: params.phone }, { phone }],
    });

    if (optOutHit) {
      if (contact) {
        contact.whatsapp = {
          ...(contact.whatsapp || { optIn: true }),
          optIn: false,
          optedOutAt: new Date(),
          source: "keyword",
        };
        await contact.save();
      }
      const recipient = await WhatsAppCampaignRecipientModel.findOne({
        accountId: params.accountId,
        phone: { $in: [phone, params.phone] },
      }).sort({ sentAt: -1 });
      if (recipient && !recipient.optedOutAt) {
        recipient.status = WHATSAPP_RECIPIENT_STATUS.OPTED_OUT;
        recipient.optedOutAt = new Date();
        recipient.repliedAt = recipient.repliedAt || new Date();
        await recipient.save();
        await WhatsAppCampaignModel.updateOne(
          { _id: recipient.campaignId },
          { $inc: { optedOutCount: 1 } },
        );
      }
      if (settings.optOut?.autoReply && settings.optOut.message) {
        await this.sendPlainText(params.accountId, phone, settings.optOut.message);
      }
      return { action: "opt_out" as const };
    }

    if (contact) {
      contact.whatsapp = {
        ...(contact.whatsapp || { optIn: true }),
        optIn: true,
        optedInAt: new Date(),
        source: "keyword",
      };
      await contact.save();
    }
    if (settings.optIn?.autoReply && settings.optIn.message) {
      await this.sendPlainText(params.accountId, phone, settings.optIn.message);
    }
    return { action: "opt_in" as const };
  }

  async applyProviderStatus(providerMessageId: string, status: string, error?: string) {
    if (!providerMessageId) return;
    const recipient = await WhatsAppCampaignRecipientModel.findOne({
      providerMessageId,
    });
    if (!recipient) return;

    const now = new Date();
    const previous = recipient.status;
    if (status === "sent" && previous === WHATSAPP_RECIPIENT_STATUS.QUEUED) {
      recipient.status = WHATSAPP_RECIPIENT_STATUS.SENT;
      recipient.sentAt = recipient.sentAt || now;
      await recipient.save();
      return;
    }
    if (status === "delivered") {
      recipient.status = WHATSAPP_RECIPIENT_STATUS.DELIVERED;
      recipient.deliveredAt = now;
      await recipient.save();
      if (previous !== WHATSAPP_RECIPIENT_STATUS.DELIVERED) {
        await WhatsAppCampaignModel.updateOne(
          { _id: recipient.campaignId },
          { $inc: { deliveredCount: 1 } },
        );
      }
      return;
    }
    if (status === "read") {
      const firstRead = !recipient.readAt;
      recipient.status = WHATSAPP_RECIPIENT_STATUS.READ;
      recipient.readAt = now;
      if (!recipient.deliveredAt) recipient.deliveredAt = now;
      await recipient.save();
      if (firstRead) {
        await WhatsAppCampaignModel.updateOne(
          { _id: recipient.campaignId },
          { $inc: { readCount: 1 } },
        );
      }
      return;
    }
    if (status === "failed") {
      recipient.status = WHATSAPP_RECIPIENT_STATUS.FAILED;
      recipient.failedAt = now;
      recipient.error = error;
      await recipient.save();
      if (previous !== WHATSAPP_RECIPIENT_STATUS.FAILED) {
        await WhatsAppCampaignModel.updateOne(
          { _id: recipient.campaignId },
          { $inc: { failedCount: 1, sentCount: -1 } },
        );
      }
    }
  }

  async markReply(accountId: string, phone: string) {
    const recipient = await WhatsAppCampaignRecipientModel.findOne({
      accountId,
      phone: { $in: [phone, toWhatsAppRecipient(phone)] },
      repliedAt: { $exists: false },
    }).sort({ sentAt: -1 });
    if (!recipient) return;
    recipient.repliedAt = new Date();
    await recipient.save();
    await WhatsAppCampaignModel.updateOne(
      { _id: recipient.campaignId },
      { $inc: { repliedCount: 1 } },
    );
  }

  async getContext(organizationId: string, accountId: string) {
    await this.assertFeature(organizationId);
    const integrationId = await this.resolveIntegrationId(accountId);
    const waAccount = integrationId
      ? await this.whatsappAccountRepository.findByIntegrationId(integrationId)
      : await this.whatsappAccountRepository.findByAccountId(accountId);
    const tier = String(waAccount?.phoneNumberInfo?.messagingLimitTier || "TIER_250");
    const limit = MESSAGING_TIER_LIMIT[tier] ?? 250;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const used = await WhatsAppCampaignRecipientModel.distinct("phone", {
      accountId: new Types.ObjectId(accountId),
      sentAt: { $gte: since },
      status: {
        $in: [
          WHATSAPP_RECIPIENT_STATUS.SENT,
          WHATSAPP_RECIPIENT_STATUS.DELIVERED,
          WHATSAPP_RECIPIENT_STATUS.READ,
        ],
      },
    });
    const remainingQuota = Number.isFinite(limit)
      ? Math.max(0, limit - used.length)
      : limit;

    return {
      qualityRating: waAccount?.phoneNumberInfo?.qualityRating || "UNKNOWN",
      messagingLimitTier: tier,
      messagingLimitLabel: formatMessagingTier(tier),
      messagingLimit: limit,
      remainingQuota,
      usedInWindow: used.length,
      displayPhoneNumber: waAccount?.phoneNumberInfo?.displayPhoneNumber,
      verifiedName: waAccount?.phoneNumberInfo?.verifiedName,
      isConnected: Boolean(waAccount?.onboardingCompleted || waAccount?.isConnected),
    };
  }

  private async resolveIntegrationId(accountId: string) {
    const { IntegrationRepository } = await import(
      "../../../integrations/repositories/integration.repository.js"
    );
    const integration = await new IntegrationRepository().findByAccountAndProvider(
      accountId,
      IntegrationProvider.WHATSAPP,
    );
    return integration?._id?.toString();
  }

  async listMarketingTemplates(accountId: string) {
    const docs = await WhatsappTemplateModel.find({
      accountId,
      category: "MARKETING",
      status: "APPROVED",
    }).sort({ updatedAt: -1 });
    return docs.map((doc) => doc.toJSON());
  }

  async getCampaign(organizationId: string, accountId: string, id: string) {
    const campaign = await WhatsAppCampaignModel.findOne({
      _id: id,
      organizationId,
      accountId,
    });
    if (!campaign) throw HttpError.notFound("Campaign not found");
    return campaign;
  }

  async listCampaigns(
    organizationId: string,
    accountId: string,
    query: { page?: number; limit?: number; status?: string; search?: string },
  ) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Number(query.limit) || 20, 100);
    const filter: Record<string, unknown> = { organizationId, accountId };
    if (query.status && query.status !== "ALL") filter.status = query.status;
    if (query.search) filter.name = { $regex: query.search, $options: "i" };
    const [docs, totalDocs] = await Promise.all([
      WhatsAppCampaignModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      WhatsAppCampaignModel.countDocuments(filter),
    ]);
    return {
      docs: docs.map((doc) => ({ ...doc.toJSON(), rates: campaignRates(doc) })),
      pagination: buildPagination({
        page,
        limit,
        totalDocs,
        docsCount: docs.length,
      }),
    };
  }

  async overview(organizationId: string, accountId: string) {
    const [totals] = await WhatsAppCampaignRecipientModel.aggregate([
      { $match: { accountId: new Types.ObjectId(accountId) } },
      {
        $group: {
          _id: null,
          sentCount: { $sum: { $cond: [{ $gt: ["$sentAt", null] }, 1, 0] } },
          deliveredCount: { $sum: { $cond: [{ $gt: ["$deliveredAt", null] }, 1, 0] } },
          readCount: { $sum: { $cond: [{ $gt: ["$readAt", null] }, 1, 0] } },
          repliedCount: { $sum: { $cond: [{ $gt: ["$repliedAt", null] }, 1, 0] } },
          failedCount: { $sum: { $cond: [{ $gt: ["$failedAt", null] }, 1, 0] } },
          optedOutCount: { $sum: { $cond: [{ $gt: ["$optedOutAt", null] }, 1, 0] } },
        },
      },
    ]);
    const campaignCount = await WhatsAppCampaignModel.countDocuments({
      organizationId,
      accountId,
    });
    const recent = await WhatsAppCampaignModel.find({ organizationId, accountId })
      .sort({ createdAt: -1 })
      .limit(8);
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - 13);
    const trendRows = await WhatsAppCampaignRecipientModel.aggregate([
      {
        $match: {
          accountId: new Types.ObjectId(accountId),
          sentAt: { $gte: since },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$sentAt" } },
          sent: { $sum: 1 },
          delivered: { $sum: { $cond: [{ $gt: ["$deliveredAt", null] }, 1, 0] } },
          read: { $sum: { $cond: [{ $gt: ["$readAt", null] }, 1, 0] } },
        },
      },
    ]);
    const counts = {
      campaigns: campaignCount,
      sentCount: Number(totals?.sentCount || 0),
      deliveredCount: Number(totals?.deliveredCount || 0),
      readCount: Number(totals?.readCount || 0),
      repliedCount: Number(totals?.repliedCount || 0),
      failedCount: Number(totals?.failedCount || 0),
      optedOutCount: Number(totals?.optedOutCount || 0),
    };
    return {
      ...counts,
      rates: campaignRates(counts),
      recent: recent.map((doc) => ({ ...doc.toJSON(), rates: campaignRates(doc) })),
      comparison: recent.map((item) => ({
        id: String(item._id),
        name: item.name,
        status: item.status,
        sentCount: item.sentCount,
        ...campaignRates(item),
      })),
      series: trendRows,
      trends: this.buildDailyTrends(trendRows, 14),
    };
  }

  private buildDailyTrends(
    rows: { _id?: string; sent?: number; delivered?: number; read?: number }[],
    days = 14,
  ) {
    const buckets = new Map<string, { sent: number; delivered: number; read: number }>();
    const keys: string[] = [];
    for (let offset = days - 1; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setUTCHours(0, 0, 0, 0);
      date.setUTCDate(date.getUTCDate() - offset);
      const key = date.toISOString().slice(0, 10);
      keys.push(key);
      buckets.set(key, { sent: 0, delivered: 0, read: 0 });
    }
    for (const row of rows) {
      const bucket = row._id ? buckets.get(row._id) : undefined;
      if (!bucket) continue;
      bucket.sent += Number(row.sent || 0);
      bucket.delivered += Number(row.delivered || 0);
      bucket.read += Number(row.read || 0);
    }
    return keys.map((day) => {
      const point = buckets.get(day) || { sent: 0, delivered: 0, read: 0 };
      return {
        date: new Date(`${day}T12:00:00.000Z`).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        day,
        ...point,
      };
    });
  }

  async createCampaign(
    context: { organizationId: string; accountId: string; userId: string },
    payload: Record<string, any>,
  ) {
    await this.assertFeature(context.organizationId);
    const template = await this.requireMarketingTemplate(
      context.accountId,
      payload.templateId,
    );
    const settings = await this.getOptInSettings(
      context.organizationId,
      context.accountId,
    );
    const campaign = await WhatsAppCampaignModel.create({
      organizationId: context.organizationId,
      accountId: context.accountId,
      name: payload.name || template.name || "WhatsApp campaign",
      templateId: template._id,
      templateName: template.name,
      templateLanguage: template.language,
      templateCategory: template.category,
      audience: {
        mode: payload.audience?.mode || "contacts",
        contactIds: payload.audience?.contactIds || [],
        filters: payload.audience?.filters || {},
      },
      excludeOptedOut: payload.excludeOptedOut ?? settings.skipOptedOutCampaigns,
      timezone: payload.timezone || "UTC",
      createdBy: context.userId || undefined,
      status: WHATSAPP_CAMPAIGN_STATUS.DRAFT,
    });

    await this.activityLogService.create({
      organizationId: context.organizationId,
      accountId: context.accountId,
      entityType: "whatsapp_campaign",
      entityId: String(campaign._id) as any,
      action: "WHATSAPP_CAMPAIGN_CREATED",
      actor: context.userId
        ? { type: "user", id: context.userId as any, name: "" }
        : { type: "system", name: "WhatsApp Marketing" },
    });

    return campaign.toJSON();
  }

  async updateCampaign(
    organizationId: string,
    accountId: string,
    id: string,
    payload: Record<string, any>,
  ) {
    const campaign = await this.getCampaign(organizationId, accountId, id);
    if (
      ![WHATSAPP_CAMPAIGN_STATUS.DRAFT, WHATSAPP_CAMPAIGN_STATUS.SCHEDULED].includes(
        campaign.status as any,
      )
    ) {
      throw HttpError.badRequest("Only draft or scheduled campaigns can be edited");
    }
    if (payload.templateId) {
      const template = await this.requireMarketingTemplate(accountId, payload.templateId);
      campaign.templateId = template._id;
      campaign.templateName = template.name;
      campaign.templateLanguage = template.language;
      campaign.templateCategory = template.category;
    }
    if (payload.name !== undefined) campaign.name = payload.name;
    if (payload.audience !== undefined) campaign.audience = payload.audience;
    if (payload.excludeOptedOut !== undefined) {
      campaign.excludeOptedOut = payload.excludeOptedOut;
    }
    if (payload.timezone) campaign.timezone = payload.timezone;
    await campaign.save();
    return campaign.toJSON();
  }

  async deleteCampaign(organizationId: string, accountId: string, id: string) {
    const campaign = await this.getCampaign(organizationId, accountId, id);
    if (
      [WHATSAPP_CAMPAIGN_STATUS.SENDING, WHATSAPP_CAMPAIGN_STATUS.QUEUED].includes(
        campaign.status as any,
      )
    ) {
      throw HttpError.badRequest("Cannot delete a running campaign");
    }
    await WhatsAppCampaignRecipientModel.deleteMany({ campaignId: id });
    await campaign.deleteOne();
    return { deleted: true };
  }

  async previewAudience(
    organizationId: string,
    accountId: string,
    audience: Record<string, any>,
    excludeOptedOut = true,
  ) {
    const settings = await this.getOptInSettings(organizationId, accountId);
    const skipOptedOut = excludeOptedOut && settings.skipOptedOutCampaigns !== false;
    const candidates = await this.resolveAudience(accountId, audience);
    const unique = this.dedupePhones(candidates);
    const eligible = unique.filter((item) => {
      if (!item.phone) return false;
      if (skipOptedOut && item.optIn === false) return false;
      return true;
    });
    return {
      audience: candidates.length,
      unique: unique.length,
      eligible: eligible.length,
      excluded: unique.length - eligible.length,
      selected: audience?.contactIds?.length || candidates.length,
      finalAudience: eligible.length,
    };
  }

  async queueCampaign(
    organizationId: string,
    accountId: string,
    id: string,
    options: { sendNow?: boolean; scheduledAt?: string; timezone?: string },
  ) {
    await this.assertFeature(organizationId);
    const campaign = await this.getCampaign(organizationId, accountId, id);
    await this.requireMarketingTemplate(accountId, String(campaign.templateId));
    const preview = await this.previewAudience(
      organizationId,
      accountId,
      campaign.audience,
      campaign.excludeOptedOut,
    );
    campaign.audienceCount = preview.audience;
    campaign.eligibleCount = preview.eligible;
    campaign.excludedCount = preview.excluded;
    if (preview.eligible < 1) {
      await campaign.save();
      throw HttpError.badRequest("No opted-in WhatsApp contacts in this audience", preview);
    }

    const context = await this.getContext(organizationId, accountId);
    if (preview.eligible > context.remainingQuota) {
      throw HttpError.forbidden(
        "Remaining WhatsApp messaging quota is not enough for this audience",
        { eligible: preview.eligible, remainingQuota: context.remainingQuota },
      );
    }

    await this.subscriptionService.checkLimit(
      organizationId,
      USAGE_METRIC.WHATSAPP_MESSAGES,
      preview.eligible,
    );

    const sendNow = Boolean(options.sendNow);
    const scheduledAt = options.scheduledAt ? new Date(options.scheduledAt) : undefined;
    if (!sendNow && scheduledAt && scheduledAt.getTime() > Date.now()) {
      const max = Date.now() + TWO_MONTHS_MS;
      if (scheduledAt.getTime() > max) {
        throw HttpError.badRequest("Schedule campaign up to two months from today");
      }
      this.assertTransition(campaign.status, WHATSAPP_CAMPAIGN_STATUS.SCHEDULED);
      campaign.status = WHATSAPP_CAMPAIGN_STATUS.SCHEDULED;
      campaign.scheduledAt = scheduledAt;
      campaign.timezone = options.timezone || campaign.timezone;
      await campaign.save();
      await this.enqueuePrepareJob(
        String(campaign._id),
        Math.max(0, scheduledAt.getTime() - Date.now()),
      );
      return campaign.toJSON();
    }

    if (campaign.status !== WHATSAPP_CAMPAIGN_STATUS.SENDING) {
      this.assertTransition(campaign.status, WHATSAPP_CAMPAIGN_STATUS.QUEUED);
      campaign.status = WHATSAPP_CAMPAIGN_STATUS.QUEUED;
      campaign.queuedAt = new Date();
      await campaign.save();
    }
    await this.enqueuePrepareJob(String(campaign._id));
    return campaign.toJSON();
  }

  async pauseCampaign(organizationId: string, accountId: string, id: string) {
    const campaign = await this.getCampaign(organizationId, accountId, id);
    this.assertTransition(campaign.status, WHATSAPP_CAMPAIGN_STATUS.PAUSED);
    campaign.status = WHATSAPP_CAMPAIGN_STATUS.PAUSED;
    campaign.pausedAt = new Date();
    await campaign.save();
    return campaign.toJSON();
  }

  async cancelCampaign(organizationId: string, accountId: string, id: string) {
    const campaign = await this.getCampaign(organizationId, accountId, id);
    this.assertTransition(campaign.status, WHATSAPP_CAMPAIGN_STATUS.CANCELED);
    campaign.status = WHATSAPP_CAMPAIGN_STATUS.CANCELED;
    campaign.canceledAt = new Date();
    await campaign.save();
    await WhatsAppCampaignRecipientModel.updateMany(
      {
        campaignId: id,
        status: {
          $in: [WHATSAPP_RECIPIENT_STATUS.PENDING, WHATSAPP_RECIPIENT_STATUS.QUEUED],
        },
      },
      { $set: { status: WHATSAPP_RECIPIENT_STATUS.SKIPPED } },
    );
    return campaign.toJSON();
  }

  async resendCampaign(
    context: { organizationId: string; accountId: string; userId: string },
    id: string,
  ) {
    const source = await this.getCampaign(context.organizationId, context.accountId, id);
    if (
      ![WHATSAPP_CAMPAIGN_STATUS.COMPLETED, WHATSAPP_CAMPAIGN_STATUS.FAILED].includes(
        source.status as any,
      )
    ) {
      throw HttpError.badRequest("Only completed or failed campaigns can be resent");
    }
    const failed = await WhatsAppCampaignRecipientModel.find({
      campaignId: source._id,
      status: WHATSAPP_RECIPIENT_STATUS.FAILED,
    }).select("contactId");
    const contactIds = failed
      .map((row) => String(row.contactId || ""))
      .filter(Boolean);
    const audience =
      contactIds.length > 0
        ? { mode: "contacts" as const, contactIds, filters: {} }
        : source.audience;
    const created = await this.createCampaign(context, {
      name: `${source.name} (resend)`,
      templateId: String(source.templateId),
      audience,
      excludeOptedOut: source.excludeOptedOut,
      timezone: source.timezone,
    });
    await WhatsAppCampaignModel.updateOne(
      { _id: created.id },
      { $set: { resendOf: source._id } },
    );
    return this.queueCampaign(
      context.organizationId,
      context.accountId,
      created.id,
      { sendNow: true },
    );
  }

  async campaignAnalytics(organizationId: string, accountId: string, id: string) {
    const campaign = await this.getCampaign(organizationId, accountId, id);
    const byStatus = await WhatsAppCampaignRecipientModel.aggregate([
      { $match: { campaignId: campaign._id } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    return {
      campaign: { ...campaign.toJSON(), rates: campaignRates(campaign) },
      byStatus: byStatus.map((row) => ({ status: row._id, count: row.count })),
    };
  }

  async listRecipients(
    organizationId: string,
    accountId: string,
    id: string,
    query: { page?: number; limit?: number; status?: string; search?: string },
  ) {
    await this.getCampaign(organizationId, accountId, id);
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Number(query.limit) || 25, 100);
    const filter: Record<string, unknown> = { campaignId: id };
    if (query.status && query.status !== "ALL") filter.status = query.status;
    if (query.search) filter.phone = { $regex: query.search, $options: "i" };
    const [docs, totalDocs] = await Promise.all([
      WhatsAppCampaignRecipientModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      WhatsAppCampaignRecipientModel.countDocuments(filter),
    ]);
    return {
      docs: docs.map((doc) => doc.toJSON()),
      pagination: buildPagination({ page, limit, totalDocs, docsCount: docs.length }),
    };
  }

  async sendTest(
    organizationId: string,
    accountId: string,
    payload: { campaignId?: string; templateId?: string; phone: string; name?: string },
  ) {
    await this.assertFeature(organizationId);
    let templateId = payload.templateId;
    if (payload.campaignId) {
      const campaign = await this.getCampaign(organizationId, accountId, payload.campaignId);
      templateId = String(campaign.templateId);
    }
    const template = await this.requireMarketingTemplate(accountId, String(templateId));
    const to = toWhatsAppRecipient(payload.phone);
    if (!to) throw HttpError.badRequest("Invalid WhatsApp number");
    await this.sendTemplate(accountId, template, {
      phone: to,
      name: payload.name || "there",
    });
    return { sent: true, to };
  }

  async prepareAndSend(campaignId: string) {
    const campaign = await WhatsAppCampaignModel.findById(campaignId);
    if (!campaign) return;
    if (
      ![
        WHATSAPP_CAMPAIGN_STATUS.QUEUED,
        WHATSAPP_CAMPAIGN_STATUS.SCHEDULED,
        WHATSAPP_CAMPAIGN_STATUS.SENDING,
      ].includes(campaign.status as any)
    ) {
      return;
    }

    if (campaign.status !== WHATSAPP_CAMPAIGN_STATUS.SENDING) {
      campaign.status = WHATSAPP_CAMPAIGN_STATUS.SENDING;
      campaign.startedAt = new Date();
      await campaign.save();
    }

    const candidates = await this.resolveAudience(
      String(campaign.accountId),
      campaign.audience,
    );
    const unique = this.dedupePhones(candidates);
    const eligible = unique.filter((item) => {
      if (!item.phone) return false;
      if (campaign.excludeOptedOut && item.optIn === false) return false;
      return true;
    });

    campaign.audienceCount = candidates.length;
    campaign.eligibleCount = eligible.length;
    campaign.excludedCount = unique.length - eligible.length;
    campaign.totalRecipients = eligible.length;
    await campaign.save();

    if (!eligible.length) {
      campaign.status = WHATSAPP_CAMPAIGN_STATUS.FAILED;
      campaign.completedAt = new Date();
      await campaign.save();
      return;
    }

    const docs = eligible.map((item) => ({
      organizationId: campaign.organizationId,
      accountId: campaign.accountId,
      campaignId: campaign._id,
      contactId: item.contactId,
      phone: item.phone,
      name: item.name || "",
      status: WHATSAPP_RECIPIENT_STATUS.PENDING,
      idempotencyKey: `${campaign._id}:${item.phone}`,
      queuedAt: new Date(),
    }));

    try {
      await WhatsAppCampaignRecipientModel.insertMany(docs, { ordered: false });
    } catch (error: any) {
      if (error?.code !== 11000) throw error;
    }

    const pending = await WhatsAppCampaignRecipientModel.find({
      campaignId: campaign._id,
      status: WHATSAPP_RECIPIENT_STATUS.PENDING,
    }).select("_id");
    const ids = pending.map((item) => String(item._id));
    for (let i = 0; i < ids.length; i += WHATSAPP_CAMPAIGN_BATCH_SIZE) {
      const batch = ids.slice(i, i + WHATSAPP_CAMPAIGN_BATCH_SIZE);
      await this.enqueueJob(
        QUEUE_JOBS.WHATSAPP_CAMPAIGN_SEND_BATCH,
        { campaignId: String(campaign._id), recipientIds: batch },
        `wa-batch-${campaign._id}-${batch[0]}`,
        { attempts: 5, backoff: { type: "exponential", delay: 4000 } },
      );
    }
  }

  async sendBatch(campaignId: string, recipientIds: string[]) {
    const campaign = await WhatsAppCampaignModel.findById(campaignId);
    if (!campaign) return;
    if (
      [WHATSAPP_CAMPAIGN_STATUS.PAUSED, WHATSAPP_CAMPAIGN_STATUS.CANCELED].includes(
        campaign.status as any,
      )
    ) {
      return;
    }
    const template = await this.requireMarketingTemplate(
      String(campaign.accountId),
      String(campaign.templateId),
    );
    await WhatsappTemplateModel.updateOne(
      { _id: template._id },
      { $set: { lastUsedAt: new Date() } },
    );

    for (const recipientId of recipientIds) {
      const recipient = await WhatsAppCampaignRecipientModel.findOneAndUpdate(
        {
          _id: recipientId,
          campaignId,
          status: WHATSAPP_RECIPIENT_STATUS.PENDING,
        },
        { $set: { status: WHATSAPP_RECIPIENT_STATUS.QUEUED } },
        { new: true },
      );
      if (!recipient) continue;

      try {
        await this.subscriptionService.checkLimit(
          String(campaign.organizationId),
          USAGE_METRIC.WHATSAPP_MESSAGES,
          1,
        );
        const result = await this.sendTemplate(String(campaign.accountId), template, {
          phone: recipient.phone,
          name: recipient.name,
        });
        const wamid = result?.doc?.messages?.[0]?.id;
        recipient.status = WHATSAPP_RECIPIENT_STATUS.SENT;
        recipient.sentAt = new Date();
        recipient.providerMessageId = wamid;
        await recipient.save();
        await WhatsAppCampaignModel.updateOne(
          { _id: campaignId },
          { $inc: { sentCount: 1 } },
        );
        await this.subscriptionService.recordUsage(
          String(campaign.organizationId),
          USAGE_METRIC.WHATSAPP_MESSAGES,
        );
      } catch (error) {
        recipient.status = WHATSAPP_RECIPIENT_STATUS.FAILED;
        recipient.failedAt = new Date();
        recipient.error = (error as Error).message;
        await recipient.save();
        await WhatsAppCampaignModel.updateOne(
          { _id: campaignId },
          { $inc: { failedCount: 1 } },
        );
        logger.error("WHATSAPP_CAMPAIGN_SEND_FAILED", {
          campaignId,
          phone: recipient.phone,
          error: (error as Error).message,
        });
      }

      if (WHATSAPP_SEND_GAP_MS > 0) {
        await new Promise((resolve) => setTimeout(resolve, WHATSAPP_SEND_GAP_MS));
      }
    }

    const remaining = await WhatsAppCampaignRecipientModel.countDocuments({
      campaignId,
      status: {
        $in: [WHATSAPP_RECIPIENT_STATUS.PENDING, WHATSAPP_RECIPIENT_STATUS.QUEUED],
      },
    });
    if (remaining === 0) {
      const latest = await WhatsAppCampaignModel.findById(campaignId);
      if (latest && latest.status === WHATSAPP_CAMPAIGN_STATUS.SENDING) {
        latest.status = WHATSAPP_CAMPAIGN_STATUS.COMPLETED;
        latest.completedAt = new Date();
        await latest.save();
      }
    }
  }

  private async requireMarketingTemplate(accountId: string, templateId: string) {
    const template = await WhatsappTemplateModel.findOne({
      _id: templateId,
      accountId,
    });
    if (!template) throw HttpError.notFound("WhatsApp template not found");
    if (template.category !== "MARKETING") {
      throw HttpError.badRequest("Broadcasts can only use MARKETING templates");
    }
    if (template.status !== "APPROVED") {
      throw HttpError.badRequest("Only approved templates can be sent");
    }
    return template;
  }

  private async sendTemplate(
    accountId: string,
    template: any,
    contact: { phone: string; name?: string },
  ) {
    const components = buildTemplateComponents(template, contact);
    return this.whatsappMessageService.send(accountId, {
      type: "template",
      to: contact.phone,
      template: {
        name: template.name,
        language: { code: template.language },
        ...(components ? { components } : {}),
      },
    });
  }

  private async sendPlainText(accountId: string, to: string, body: string) {
    try {
      await this.whatsappMessageService.send(accountId, {
        type: "text",
        to,
        text: { body },
      });
    } catch (error) {
      logger.error("WHATSAPP_OPTIN_AUTOREPLY_FAILED", {
        accountId,
        to,
        error: (error as Error).message,
      });
    }
  }

  private async resolveAudience(accountId: string, audience: Record<string, any>) {
    const filter: Record<string, unknown> = {
      accountId,
      phone: { $exists: true, $nin: [null, ""] },
    };
    if (audience?.mode === "contacts" && audience?.contactIds?.length) {
      filter._id = { $in: audience.contactIds };
    }
    const filters = audience?.filters || {};
    if (filters.source) filter.source = filters.source;
    if (filters.status) filter.status = filters.status;
    const contacts = await ContactModel.find(filter)
      .select("name phone whatsapp")
      .limit(100000)
      .lean();
    return contacts.map((contact) => ({
      contactId: contact._id,
      name: contact.name,
      phone: toWhatsAppRecipient(contact.phone || ""),
      optIn: contact.whatsapp?.optIn !== false,
    }));
  }

  private dedupePhones(
    rows: { contactId: unknown; name?: string; phone: string; optIn: boolean }[],
  ) {
    const seen = new Set<string>();
    const unique: typeof rows = [];
    for (const row of rows) {
      if (!row.phone || seen.has(row.phone)) continue;
      seen.add(row.phone);
      unique.push(row);
    }
    return unique;
  }

  private async enqueuePrepareJob(campaignId: string, delay = 0) {
    await this.enqueueJob(
      QUEUE_JOBS.WHATSAPP_CAMPAIGN_PREPARE,
      { campaignId },
      `wa-prepare-${campaignId}`,
      { attempts: 5, delay },
    );
  }

  private async enqueueJob(
    name: string,
    data: Record<string, unknown>,
    jobId: string,
    options: Record<string, unknown> = {},
  ) {
    const existing = await emailQueue.getJob(jobId);
    if (existing) {
      const state = await existing.getState();
      if (state === "active" || state === "waiting" || state === "delayed") return;
      await existing.remove();
    }
    await emailQueue.add(name, data, { ...options, jobId });
  }
}

export const whatsappBroadcastService = new WhatsAppBroadcastService();
