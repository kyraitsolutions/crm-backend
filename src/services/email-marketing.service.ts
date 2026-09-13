import crypto from "crypto";
import { Types } from "mongoose";
import { ContactModel } from "../models/contact.model.js";
import { EmailCampaignModel } from "../models/email-campaign.model.js";
import { EmailCampaignRecipientModel } from "../models/email-campaign-recipient.model.js";
import { EmailSuppressionModel } from "../models/email-suppression.model.js";
import { EmailEventModel } from "../models/email-event.model.js";
import { EmailTrackingLinkModel } from "../models/email-tracking-link.model.js";
import { EmailTemplateModel } from "../models/emailTemplate.js";
import { Organization } from "../models/organization.model.js";
import { HttpError } from "../utils/http.error.js";
import logger from "../utils/logger.js";
import { emailQueue } from "../queue/queue.js";
import { QUEUE_JOBS } from "../constants/queue-jobs.constant.js";
import { SubscriptionService } from "./subscription.service.js";
import { ActivityLogService } from "./activityLog.service.js";
import { FEATURE, USAGE_METRIC } from "../constants/subscription.constant.js";
import {
  ALLOWED_CAMPAIGN_TRANSITIONS,
  EMAIL_CAMPAIGN_BATCH_SIZE,
  EMAIL_CAMPAIGN_STATUS,
  EMAIL_ERROR,
  EMAIL_EVENT_TYPE,
  EMAIL_RECIPIENT_STATUS,
  EMAIL_SEND_GAP_MS,
  EMAIL_SUPPRESSION_REASON,
  PERSONALIZATION_FALLBACKS,
} from "../constants/email-marketing.constant.js";
import {
  campaignRates,
  dedupeRecipients,
  isValidEmailFormat,
  normalizeEmail,
} from "../utils/email-analytics.util.js";
import {
  createTrackingToken,
  normalizeProviderMessageId,
  publicApiBase,
  verifyTrackingToken,
} from "../utils/email-tracking-token.js";
import { marketingEmailProvider } from "../providers/email.provider.js";
import { ENV } from "../constants/env.constants.js";
import { buildPagination } from "../utils/paginationBuilder.js";

export class EmailMarketingService {
  private subscriptionService = new SubscriptionService();
  private activityLogService = new ActivityLogService();

  private async assertFeature(organizationId: string) {
    try {
      await this.subscriptionService.checkFeature(
        organizationId,
        FEATURE.EMAIL_MARKETING,
      );
    } catch (error) {
      const err = error as HttpError;
      throw HttpError.forbidden(
        err.message || "Email Marketing is not available on your current plan.",
        err.details,
        EMAIL_ERROR.EMAIL_MARKETING_NOT_AVAILABLE,
      );
    }
  }

  private assertTransition(from: string, to: string) {
    const allowed = ALLOWED_CAMPAIGN_TRANSITIONS[from] || [];
    if (!allowed.includes(to)) {
      throw HttpError.badRequest(
        `Cannot change campaign from ${from} to ${to}`,
        undefined,
        EMAIL_ERROR.CAMPAIGN_INVALID,
      );
    }
  }

  async getCampaign(organizationId: string, accountId: string, id: string) {
    const campaign = await EmailCampaignModel.findOne({
      _id: id,
      organizationId,
      accountId,
    });
    if (!campaign) {
      throw HttpError.notFound("Campaign not found", undefined, EMAIL_ERROR.CAMPAIGN_NOT_FOUND);
    }
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
    if (query.search) {
      filter.name = { $regex: query.search, $options: "i" };
    }
    const [docs, totalDocs] = await Promise.all([
      EmailCampaignModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      EmailCampaignModel.countDocuments(filter),
    ]);
    return {
      docs: docs.map((doc) => ({
        ...doc.toJSON(),
        rates: campaignRates(doc),
      })),
      pagination: buildPagination({
        page,
        limit,
        totalDocs,
        docsCount: docs.length,
      }),
    };
  }

  async overview(organizationId: string, accountId: string) {
    const [totals] = await EmailCampaignRecipientModel.aggregate([
      { $match: { accountId: new Types.ObjectId(accountId) } },
      {
        $group: {
          _id: null,
          sentCount: { $sum: { $cond: [{ $gt: ["$sentAt", null] }, 1, 0] } },
          deliveredCount: {
            $sum: {
              $cond: [{ $gt: ["$deliveredAt", null] }, 1, { $cond: [{ $gt: ["$sentAt", null] }, 1, 0] }],
            },
          },
          openedCount: { $sum: { $cond: [{ $gt: ["$openedAt", null] }, 1, 0] } },
          clickedCount: { $sum: { $cond: [{ $gt: ["$clickedAt", null] }, 1, 0] } },
          bouncedCount: { $sum: { $cond: [{ $gt: ["$bouncedAt", null] }, 1, 0] } },
          unsubscribedCount: { $sum: { $cond: [{ $gt: ["$unsubscribedAt", null] }, 1, 0] } },
        },
      },
    ]);
    const campaignCount = await EmailCampaignModel.countDocuments({
      organizationId,
      accountId,
    });

    const recent = await EmailCampaignModel.find({
      organizationId,
      accountId,
    })
      .sort({ createdAt: -1 })
      .limit(8);

    const comparison = recent.map((item) => ({
      id: String(item._id),
      name: item.name,
      status: item.status,
      ...campaignRates(item),
      sentCount: item.sentCount,
    }));

    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - 13);
    const recipientTrendRows = await EmailCampaignRecipientModel.aggregate([
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
          opened: {
            $sum: { $cond: [{ $gt: ["$openedAt", null] }, 1, 0] },
          },
          clicked: {
            $sum: { $cond: [{ $gt: ["$clickedAt", null] }, 1, 0] },
          },
        },
      },
    ]);

    const counts = {
      campaigns: campaignCount,
      sentCount: Number(totals?.sentCount || 0),
      deliveredCount: Number(totals?.deliveredCount || 0),
      openedCount: Number(totals?.openedCount || 0),
      clickedCount: Number(totals?.clickedCount || 0),
      bouncedCount: Number(totals?.bouncedCount || 0),
      unsubscribedCount: Number(totals?.unsubscribedCount || 0),
      totalRecipients: Number(totals?.sentCount || 0),
    };

    return {
      ...counts,
      rates: campaignRates(counts),
      recent: recent.map((doc) => ({ ...doc.toJSON(), rates: campaignRates(doc) })),
      comparison,
      series: recipientTrendRows,
      trends: this.buildDailyTrends(recipientTrendRows, 14),
    };
  }

  private buildDailyTrends(
    rows: { _id?: string | { day?: string; eventType?: string }; sent?: number; opened?: number; clicked?: number; count?: number }[],
    days = 14,
  ) {
    const buckets = new Map<string, { sent: number; opened: number; clicked: number }>();
    const keys: string[] = [];
    for (let offset = days - 1; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setUTCHours(0, 0, 0, 0);
      date.setUTCDate(date.getUTCDate() - offset);
      const key = date.toISOString().slice(0, 10);
      keys.push(key);
      buckets.set(key, { sent: 0, opened: 0, clicked: 0 });
    }

    for (const row of rows) {
      const day = typeof row._id === "string" ? row._id : row._id?.day;
      const bucket = day ? buckets.get(day) : undefined;
      if (!bucket) continue;
      if (typeof row.sent === "number" || typeof row.opened === "number") {
        bucket.sent += Number(row.sent || 0);
        bucket.opened += Number(row.opened || 0);
        bucket.clicked += Number(row.clicked || 0);
        continue;
      }
      const count = Number(row.count || 0);
      if (typeof row._id === "object" && row._id?.eventType === EMAIL_EVENT_TYPE.SENT) bucket.sent += count;
      if (typeof row._id === "object" && row._id?.eventType === EMAIL_EVENT_TYPE.OPENED) bucket.opened += count;
      if (typeof row._id === "object" && row._id?.eventType === EMAIL_EVENT_TYPE.CLICKED) bucket.clicked += count;
    }

    return keys.map((day) => {
      const point = buckets.get(day) || { sent: 0, opened: 0, clicked: 0 };
      const label = new Date(`${day}T12:00:00.000Z`).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      return { date: label, day, ...point };
    });
  }

  async createCampaign(
    context: {
      organizationId: string;
      accountId: string;
      userId: string;
    },
    payload: Record<string, any>,
  ) {
    await this.assertFeature(context.organizationId);
    await this.subscriptionService.checkLimit(
      context.organizationId,
      USAGE_METRIC.EMAIL_CAMPAIGNS,
    );

    if (!payload.templateId) {
      throw HttpError.badRequest(
        "Select an email template before creating a campaign",
        undefined,
        EMAIL_ERROR.INVALID_EMAIL_CONTENT,
      );
    }
    const template = await EmailTemplateModel.findOne({
      _id: payload.templateId,
      $or: [{ accountId: context.accountId }, { organizationId: context.organizationId }],
    });
    if (!template) {
      throw HttpError.notFound("Email template not found");
    }
    if (!template.html) {
      throw HttpError.badRequest("The selected template has no body");
    }

    const html = String(template.html);
    const campaign = await EmailCampaignModel.create({
      organizationId: context.organizationId,
      accountId: context.accountId,
      name: payload.name || template.name || "Untitled campaign",
      subject: payload.subject || template.subject,
      previewText: payload.previewText || template.preheader || "",
      fromName: payload.fromName || "Kyra CRM",
      fromEmail: normalizeEmail(payload.fromEmail || ENV.SMTP.FROM_EMAIL),
      replyTo: payload.replyTo ? normalizeEmail(payload.replyTo) : undefined,
      html,
      text: payload.text || "",
      templateId: template._id,
      audience: {
        mode: payload.audience?.mode || "all",
        contactIds: payload.audience?.contactIds || [],
        leadIds: payload.audience?.leadIds || [],
        filters: payload.audience?.filters || {},
      },
      timezone: payload.timezone || "UTC",
      createdBy: context.userId || undefined,
      status: EMAIL_CAMPAIGN_STATUS.DRAFT,
    });

    await this.subscriptionService.recordUsage(
      context.organizationId,
      USAGE_METRIC.EMAIL_CAMPAIGNS,
    );

    await this.activityLogService.create({
      organizationId: context.organizationId,
      accountId: context.accountId,
      entityType: "email_campaign",
      entityId: String(campaign._id) as any,
      action: "EMAIL_CAMPAIGN_CREATED",
      actor: context.userId
        ? { type: "user", id: context.userId as any, name: "" }
        : { type: "system", name: "Email Marketing" },
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
      ![EMAIL_CAMPAIGN_STATUS.DRAFT, EMAIL_CAMPAIGN_STATUS.SCHEDULED].includes(
        campaign.status as any,
      )
    ) {
      throw HttpError.badRequest(
        "Only draft or scheduled campaigns can be edited",
        undefined,
        EMAIL_ERROR.CAMPAIGN_ALREADY_SENT,
      );
    }
    const allowed = [
      "name",
      "subject",
      "previewText",
      "fromName",
      "fromEmail",
      "replyTo",
      "html",
      "text",
      "templateId",
      "audience",
      "timezone",
    ];
    for (const key of allowed) {
      if (payload[key] !== undefined) (campaign as any)[key] = payload[key];
    }
    if (payload.fromEmail) campaign.fromEmail = normalizeEmail(payload.fromEmail);
    await campaign.save();
    return campaign.toJSON();
  }

  async deleteCampaign(organizationId: string, accountId: string, id: string) {
    const campaign = await this.getCampaign(organizationId, accountId, id);
    if (
      [EMAIL_CAMPAIGN_STATUS.SENDING, EMAIL_CAMPAIGN_STATUS.QUEUED].includes(
        campaign.status as any,
      )
    ) {
      throw HttpError.badRequest("Cannot delete a running campaign");
    }
    await EmailCampaignRecipientModel.deleteMany({ campaignId: id, organizationId });
    await campaign.deleteOne();
    await this.activityLogService.logDelete({
      organizationId,
      accountId,
      entityType: "email_campaign",
      entityId: id,
      actor: { type: "user", name: "" },
      metadata: { name: campaign.name },
      deletedData: { name: campaign.name, status: campaign.status },
    });
    return { deleted: true };
  }

  async previewAudience(
    organizationId: string,
    accountId: string,
    audience: { mode?: string; leadIds?: string[]; filters?: Record<string, any> },
  ) {
    const candidates = await this.resolveAudience(accountId, audience);
    const { unique } = dedupeRecipients(candidates);
    const suppressed = await this.suppressedSet(
      organizationId,
      unique.map((item) => item.email),
    );
    const eligible = unique.filter(
      (item) =>
        isValidEmailFormat(item.email) &&
        !suppressed.has(item.email) &&
        item.status !== "unsubscribed" &&
        item.status !== "bounced",
    );
    return {
      audience: candidates.length,
      unique: unique.length,
      eligible: eligible.length,
      excluded: candidates.length - eligible.length,
    };
  }

  validateContent(campaign: {
    subject?: string;
    html?: string;
    fromEmail?: string;
    fromName?: string;
  }) {
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!campaign.subject?.trim()) errors.push("Subject is required");
    if (!campaign.html?.trim()) errors.push("Email content is required");
    if (!campaign.fromName?.trim()) errors.push("From name is required");
    if (!isValidEmailFormat(campaign.fromEmail)) errors.push("From email is invalid");
    if (campaign.html && campaign.html.length > 400000) {
      warnings.push("Email content is very large and may affect deliverability");
    }
    const missingVars = Array.from(campaign.html?.matchAll(/\{\{(\w+)\}\}/g) || []).map(
      (match) => match[1],
    );
    for (const key of missingVars) {
      if (!(key in PERSONALIZATION_FALLBACKS)) {
        warnings.push(`Unknown personalization variable {{${key}}}`);
      }
    }
    return { errors, warnings, valid: errors.length === 0 };
  }

  async queueCampaign(
    organizationId: string,
    accountId: string,
    id: string,
    options: { sendNow?: boolean; scheduledAt?: string; timezone?: string },
  ) {
    await this.assertFeature(organizationId);
    const campaign = await this.getCampaign(organizationId, accountId, id);
    const validation = this.validateContent(campaign);
    campaign.validation = validation;
    if (!validation.valid) {
      await campaign.save();
      throw HttpError.badRequest(
        validation.errors.join(". "),
        validation,
        EMAIL_ERROR.INVALID_EMAIL_CONTENT,
      );
    }

    const preview = await this.previewAudience(organizationId, accountId, campaign.audience);
    campaign.audienceCount = preview.audience;
    campaign.eligibleCount = preview.eligible;
    campaign.excludedCount = preview.excluded;
    if (preview.eligible < 1) {
      await campaign.save();
      throw HttpError.badRequest(
        "No eligible recipients after validation",
        preview,
        EMAIL_ERROR.NO_RECIPIENTS,
      );
    }

    await this.subscriptionService.checkLimit(
      organizationId,
      USAGE_METRIC.EMAILS,
      preview.eligible,
    );
    const recipientLimit = await this.subscriptionService.getRemainingUsage(
      organizationId,
      USAGE_METRIC.EMAILS,
    );
    if (Number.isFinite(recipientLimit) && preview.eligible > recipientLimit) {
      throw HttpError.forbidden(
        "You've reached your email sending limit. Upgrade your plan to continue sending campaigns.",
        { eligible: preview.eligible, remaining: recipientLimit },
        EMAIL_ERROR.EMAIL_LIMIT_REACHED,
      );
    }

    const sendNow = Boolean(options.sendNow);
    const scheduledAt = options.scheduledAt ? new Date(options.scheduledAt) : undefined;
    if (!sendNow && scheduledAt && scheduledAt.getTime() > Date.now()) {
      this.assertTransition(campaign.status, EMAIL_CAMPAIGN_STATUS.SCHEDULED);
      campaign.status = EMAIL_CAMPAIGN_STATUS.SCHEDULED;
      campaign.scheduledAt = scheduledAt;
      campaign.timezone = options.timezone || campaign.timezone;
      await campaign.save();
      await this.enqueuePrepareJob(
        String(campaign._id),
        organizationId,
        accountId,
        Math.max(0, scheduledAt.getTime() - Date.now()),
      );
      logger.info("CAMPAIGN_SCHEDULED", { campaignId: String(campaign._id) });
      return campaign.toJSON();
    }

    if (campaign.status !== EMAIL_CAMPAIGN_STATUS.SENDING) {
      this.assertTransition(campaign.status, EMAIL_CAMPAIGN_STATUS.QUEUED);
      campaign.status = EMAIL_CAMPAIGN_STATUS.QUEUED;
      campaign.queuedAt = new Date();
      await campaign.save();
    }
    await this.enqueuePrepareJob(String(campaign._id), organizationId, accountId);
    logger.info("CAMPAIGN_QUEUED", { campaignId: String(campaign._id) });
    return campaign.toJSON();
  }

  private async enqueuePrepareJob(
    campaignId: string,
    organizationId: string,
    accountId: string,
    delay = 0,
  ) {
    await this.enqueueJob(
      QUEUE_JOBS.EMAIL_CAMPAIGN_PREPARE,
      { campaignId, organizationId, accountId },
      `prepare-${campaignId}`,
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
      if (state === "active" || state === "waiting" || state === "delayed") {
        return;
      }
      await existing.remove();
    }
    await emailQueue.add(name, data, {
      ...options,
      jobId,
    });
  }

  async pauseCampaign(organizationId: string, accountId: string, id: string) {
    const campaign = await this.getCampaign(organizationId, accountId, id);
    this.assertTransition(campaign.status, EMAIL_CAMPAIGN_STATUS.PAUSED);
    campaign.status = EMAIL_CAMPAIGN_STATUS.PAUSED;
    campaign.pausedAt = new Date();
    await campaign.save();
    return campaign.toJSON();
  }

  async cancelCampaign(organizationId: string, accountId: string, id: string) {
    const campaign = await this.getCampaign(organizationId, accountId, id);
    this.assertTransition(campaign.status, EMAIL_CAMPAIGN_STATUS.CANCELED);
    campaign.status = EMAIL_CAMPAIGN_STATUS.CANCELED;
    campaign.canceledAt = new Date();
    await campaign.save();
    await EmailCampaignRecipientModel.updateMany(
      { campaignId: id, status: { $in: [EMAIL_RECIPIENT_STATUS.PENDING, EMAIL_RECIPIENT_STATUS.QUEUED] } },
      { $set: { status: EMAIL_RECIPIENT_STATUS.SKIPPED } },
    );
    return campaign.toJSON();
  }

  async prepareAndSend(campaignId: string) {
    const campaign = await EmailCampaignModel.findById(campaignId);
    if (!campaign) return;
    if (
      ![
        EMAIL_CAMPAIGN_STATUS.QUEUED,
        EMAIL_CAMPAIGN_STATUS.SCHEDULED,
        EMAIL_CAMPAIGN_STATUS.SENDING,
      ].includes(campaign.status as any)
    ) {
      return;
    }

    if (campaign.status !== EMAIL_CAMPAIGN_STATUS.SENDING) {
      campaign.status = EMAIL_CAMPAIGN_STATUS.SENDING;
      campaign.startedAt = new Date();
      await campaign.save();
      logger.info("CAMPAIGN_STARTED", { campaignId });
    }

    const candidates = await this.resolveAudience(
      String(campaign.accountId),
      campaign.audience,
    );
    const { unique } = dedupeRecipients(candidates);
    const suppressed = await this.suppressedSet(
      String(campaign.organizationId),
      unique.map((item) => item.email),
    );
    const eligible = unique.filter(
      (item) =>
        isValidEmailFormat(item.email) &&
        !suppressed.has(item.email) &&
        item.status !== "unsubscribed" &&
        item.status !== "bounced",
    );

    campaign.audienceCount = candidates.length;
    campaign.eligibleCount = eligible.length;
    campaign.excludedCount = candidates.length - eligible.length;
    campaign.totalRecipients = eligible.length;
    await campaign.save();

    if (!eligible.length) {
      campaign.status = EMAIL_CAMPAIGN_STATUS.FAILED;
      campaign.completedAt = new Date();
      await campaign.save();
      return;
    }

    const docs = eligible.map((item) => ({
      organizationId: campaign.organizationId,
      accountId: campaign.accountId,
      campaignId: campaign._id,
      contactId: item.contactId,
      email: item.email,
      name: item.name || "",
      status: EMAIL_RECIPIENT_STATUS.PENDING,
      idempotencyKey: `${campaign._id}:${item.email}`,
      queuedAt: new Date(),
    }));

    try {
      await EmailCampaignRecipientModel.insertMany(docs, { ordered: false });
    } catch (error: any) {
      if (error?.code !== 11000) throw error;
    }

    const pending = await EmailCampaignRecipientModel.find({
      campaignId: campaign._id,
      status: EMAIL_RECIPIENT_STATUS.PENDING,
    }).select("_id");

    const ids = pending.map((item) => String(item._id));
    for (let i = 0; i < ids.length; i += EMAIL_CAMPAIGN_BATCH_SIZE) {
      const batch = ids.slice(i, i + EMAIL_CAMPAIGN_BATCH_SIZE);
      await this.enqueueJob(
        QUEUE_JOBS.EMAIL_CAMPAIGN_SEND_BATCH,
        {
          campaignId: String(campaign._id),
          recipientIds: batch,
        },
        `batch-${campaign._id}-${batch[0]}`,
        { attempts: 5, backoff: { type: "exponential", delay: 4000 } },
      );
    }
  }

  async sendBatch(campaignId: string, recipientIds: string[]) {
    const campaign = await EmailCampaignModel.findById(campaignId);
    if (!campaign) return;
    if (campaign.status === EMAIL_CAMPAIGN_STATUS.PAUSED) return;
    if (campaign.status === EMAIL_CAMPAIGN_STATUS.CANCELED) return;

    const organization = await Organization.findById(campaign.organizationId).lean();
    const orgName = (organization as any)?.name || "your organization";

    for (const recipientId of recipientIds) {
      const recipient = await EmailCampaignRecipientModel.findOneAndUpdate(
        {
          _id: recipientId,
          campaignId,
          status: EMAIL_RECIPIENT_STATUS.PENDING,
        },
        { $set: { status: EMAIL_RECIPIENT_STATUS.QUEUED } },
        { new: true },
      );
      if (!recipient) continue;

      try {
        await this.subscriptionService.checkLimit(
          String(campaign.organizationId),
          USAGE_METRIC.EMAILS,
          1,
        );
        const html = await this.renderHtml(campaign, recipient, orgName);
        const result = await marketingEmailProvider.sendEmail({
          to: recipient.email,
          subject: this.applyVars(campaign.subject, recipient, orgName),
          html,
          fromEmail: campaign.fromEmail,
          fromName: campaign.fromName,
          replyTo: campaign.replyTo,
          idempotencyKey: recipient.idempotencyKey,
          tags: [
            { Name: "campaignId", Value: String(campaign._id) },
            { Name: "recipientId", Value: String(recipient._id) },
          ],
        });

        if (!result.status) {
          recipient.status = EMAIL_RECIPIENT_STATUS.FAILED;
          recipient.error = result.error || "Provider failed";
          await recipient.save();
          await EmailCampaignModel.updateOne(
            { _id: campaignId },
            { $inc: { failedCount: 1 } },
          );
          await this.recordEvent({
            campaign,
            recipient,
            eventType: EMAIL_EVENT_TYPE.FAILED,
          });
          continue;
        }

        recipient.status = EMAIL_RECIPIENT_STATUS.DELIVERED;
        recipient.providerMessageId =
          normalizeProviderMessageId(result.messageId || undefined) || undefined;
        recipient.sentAt = new Date();
        recipient.deliveredAt = new Date();
        await recipient.save();
        await EmailCampaignModel.updateOne(
          { _id: campaignId },
          { $inc: { sentCount: 1, deliveredCount: 1 } },
        );
        await this.subscriptionService.recordUsage(
          String(campaign.organizationId),
          USAGE_METRIC.EMAILS,
        );
        await this.recordEvent({
          campaign,
          recipient,
          eventType: EMAIL_EVENT_TYPE.SENT,
          providerEventId: result.messageId || undefined,
        });
        if (recipient.contactId) {
          await this.activityLogService.create({
            organizationId: String(campaign.organizationId),
            accountId: String(campaign.accountId),
            entityType: "contact",
            entityId: String(recipient.contactId) as any,
            action: "EMAIL_SENT",
            actor: { type: "system", name: "Email Marketing" },
            metadata: { campaignId, campaignName: campaign.name },
          });
        }
        await this.recordEvent({
          campaign,
          recipient,
          eventType: EMAIL_EVENT_TYPE.DELIVERED,
          providerEventId: result.messageId ? `${result.messageId}:delivered` : undefined,
        });
        logger.info("EMAIL_SENT", {
          campaignId,
          email: recipient.email,
          trackingBase: publicApiBase(),
        });
        if (!publicApiBase().startsWith("https://")) {
          logger.error(
            "Email tracking URL is not public HTTPS. Gmail cannot record opens/clicks. Set EMAIL_TRACKING_BASE_URL to a public HTTPS origin of this API (Cloudflare tunnel or production).",
            { trackingBase: publicApiBase() },
          );
        }
      } catch (error) {
        recipient.status = EMAIL_RECIPIENT_STATUS.FAILED;
        recipient.error = (error as Error).message;
        await recipient.save();
        throw error;
      }

      if (EMAIL_SEND_GAP_MS > 0) {
        await new Promise((resolve) => setTimeout(resolve, EMAIL_SEND_GAP_MS));
      }
    }

    const remaining = await EmailCampaignRecipientModel.countDocuments({
      campaignId,
      status: { $in: [EMAIL_RECIPIENT_STATUS.PENDING, EMAIL_RECIPIENT_STATUS.QUEUED] },
    });
    if (remaining === 0) {
      const latest = await EmailCampaignModel.findById(campaignId);
      if (
        latest &&
        latest.status === EMAIL_CAMPAIGN_STATUS.SENDING
      ) {
        latest.status = EMAIL_CAMPAIGN_STATUS.COMPLETED;
        latest.completedAt = new Date();
        await latest.save();
        logger.info("CAMPAIGN_COMPLETED", { campaignId });
      }
    }
  }

  async sendTest(
    organizationId: string,
    accountId: string,
    id: string,
    to: string,
  ) {
    const campaign = await this.getCampaign(organizationId, accountId, id);
    if (!isValidEmailFormat(to)) {
      throw HttpError.badRequest("Invalid test email");
    }
    const org = await Organization.findById(organizationId).lean();
    const html = await this.renderHtml(
      campaign,
      { email: to, name: "there", _id: "test", leadId: undefined } as any,
      (org as any)?.name || "your organization",
      true,
    );
    const result = await marketingEmailProvider.sendEmail({
      to: normalizeEmail(to),
      subject: `[TEST] ${campaign.subject}`,
      html,
      fromEmail: campaign.fromEmail,
      fromName: campaign.fromName,
      replyTo: campaign.replyTo,
    });
    if (!result.status) {
      throw HttpError.internal(result.error || "Failed to send test email");
    }
    return { sent: true };
  }

  async campaignAnalytics(organizationId: string, accountId: string, id: string) {
    const campaign = await this.getCampaign(organizationId, accountId, id);
    const topLinks = await EmailEventModel.aggregate([
      {
        $match: {
          campaignId: campaign._id,
          eventType: EMAIL_EVENT_TYPE.CLICKED,
          url: { $exists: true, $ne: "" },
        },
      },
      { $group: { _id: "$url", clicks: { $sum: 1 } } },
      { $sort: { clicks: -1 } },
      { $limit: 10 },
    ]);
    const timeline = await EmailEventModel.aggregate([
      { $match: { campaignId: campaign._id } },
      {
        $group: {
          _id: {
            hour: { $dateToString: { format: "%Y-%m-%d %H:00", date: "$occurredAt" } },
            eventType: "$eventType",
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.hour": 1 } },
    ]);
    return {
      campaign: { ...campaign.toJSON(), rates: campaignRates(campaign) },
      topLinks: topLinks.map((item) => ({ url: item._id, clicks: item.clicks })),
      timeline,
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
    const filter: Record<string, unknown> = { campaignId: id, organizationId };
    if (query.status && query.status !== "ALL") filter.status = query.status;
    if (query.search) filter.email = { $regex: query.search, $options: "i" };
    const [docs, totalDocs] = await Promise.all([
      EmailCampaignRecipientModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      EmailCampaignRecipientModel.countDocuments(filter),
    ]);
    return {
      docs: docs.map((doc) => doc.toJSON()),
      pagination: buildPagination({ page, limit, totalDocs, docsCount: docs.length }),
    };
  }

  async trackOpen(token: string) {
    const resolved = await this.resolveTrackingRef(token, "open");
    if (!resolved) {
      logger.warn("TRACKING_OPEN_INVALID", { token: String(token || "").slice(0, 24) });
      return;
    }
    logger.info("TRACKING_OPEN", {
      campaignId: resolved.campaignId,
      recipientId: resolved.recipientId,
    });
    await this.applyEngagement(resolved.campaignId, resolved.recipientId, EMAIL_EVENT_TYPE.OPENED);
  }

  async trackClick(token: string) {
    const resolved = await this.resolveTrackingRef(token, "click");
    if (!resolved) return "/";
    await this.applyEngagement(
      resolved.campaignId,
      resolved.recipientId,
      EMAIL_EVENT_TYPE.CLICKED,
      resolved.url,
    );
    return resolved.url || "/";
  }

  async unsubscribe(token: string) {
    const resolved = await this.resolveTrackingRef(token, "unsub");
    if (!resolved) {
      throw HttpError.badRequest("Invalid unsubscribe link");
    }
    const recipient = await EmailCampaignRecipientModel.findById(resolved.recipientId);
    if (!recipient) throw HttpError.notFound("Recipient not found");
    await EmailSuppressionModel.updateOne(
      { organizationId: recipient.organizationId, email: recipient.email },
      {
        $set: {
          reason: EMAIL_SUPPRESSION_REASON.UNSUBSCRIBED,
          source: "unsubscribe_link",
          campaignId: recipient.campaignId,
          accountId: recipient.accountId,
        },
      },
      { upsert: true },
    );
    if (!recipient.unsubscribedAt) {
      recipient.unsubscribedAt = new Date();
      recipient.status = EMAIL_RECIPIENT_STATUS.UNSUBSCRIBED;
      await recipient.save();
      await EmailCampaignModel.updateOne(
        { _id: recipient.campaignId },
        { $inc: { unsubscribedCount: 1 } },
      );
      const campaign = await EmailCampaignModel.findById(recipient.campaignId);
      if (campaign) {
        await this.recordEvent({
          campaign,
          recipient,
          eventType: EMAIL_EVENT_TYPE.UNSUBSCRIBED,
        });
      }
    }
    await ContactModel.updateOne(
      { accountId: recipient.accountId, email: recipient.email },
      { $set: { status: "unsubscribed" } },
    );
    return { email: recipient.email };
  }

  async listSuppression(organizationId: string, query: { page?: number; search?: string }) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = 50;
    const filter: Record<string, unknown> = { organizationId };
    if (query.search) filter.email = { $regex: query.search, $options: "i" };
    const [docs, totalDocs] = await Promise.all([
      EmailSuppressionModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      EmailSuppressionModel.countDocuments(filter),
    ]);
    return {
      docs: docs.map((doc) => doc.toJSON()),
      pagination: buildPagination({ page, limit, totalDocs, docsCount: docs.length }),
    };
  }

  async addSuppression(
    organizationId: string,
    email: string,
    reason = EMAIL_SUPPRESSION_REASON.UNSUBSCRIBED,
  ) {
    const normalized = normalizeEmail(email);
    if (!isValidEmailFormat(normalized)) {
      throw HttpError.badRequest("Invalid email");
    }
    const doc = await EmailSuppressionModel.findOneAndUpdate(
      { organizationId, email: normalized },
      { $set: { reason, source: "manual" } },
      { upsert: true, new: true },
    );
    return doc?.toJSON();
  }

  async listTemplates(accountId: string, organizationId: string) {
    const docs = await EmailTemplateModel.find({
      $or: [{ accountId }, { organizationId }],
    }).sort({ createdAt: -1 });
    return docs.map((doc) => ({ ...doc.toJSON(), id: String(doc._id) }));
  }

  async createTemplate(accountId: string, organizationId: string, payload: any, userId?: string) {
    const doc = await EmailTemplateModel.create({
      ...payload,
      accountId,
      organizationId,
      createdBy: userId,
      status: payload.status || "active",
    });
    await this.activityLogService.logCreate({
      accountId,
      organizationId,
      entityType: "email_template",
      entityId: String(doc._id),
      actor: this.activityLogService.userActor({ id: userId }),
      metadata: { name: doc.name, subject: doc.subject },
    });
    return doc.toJSON();
  }

  async updateTemplate(accountId: string, id: string, payload: any) {
    const existing = await EmailTemplateModel.findOne({ _id: id, accountId });
    const doc = await EmailTemplateModel.findOneAndUpdate(
      { _id: id, accountId },
      payload,
      { new: true },
    );
    if (!doc) throw HttpError.notFound("Template not found");
    await this.activityLogService.logUpdate({
      oldDoc: existing?.toJSON?.() || existing,
      newDoc: doc.toJSON(),
      accountId,
      organizationId: String((doc as any).organizationId || ""),
      entityType: "email_template",
      entityId: id,
      actor: { type: "user", name: "" },
      metadata: { name: doc.name },
    });
    return doc.toJSON();
  }

  async deleteTemplate(accountId: string, id: string) {
    const existing = await EmailTemplateModel.findOne({ _id: id, accountId });
    await EmailTemplateModel.deleteOne({ _id: id, accountId });
    if (existing) {
      await this.activityLogService.logDelete({
        accountId,
        organizationId: String((existing as any).organizationId || ""),
        entityType: "email_template",
        entityId: id,
        actor: { type: "user", name: "" },
        metadata: { name: existing.name },
        deletedData: { name: existing.name, subject: existing.subject },
      });
    }
    return { deleted: true };
  }

  async duplicateTemplate(accountId: string, id: string) {
    const doc = await EmailTemplateModel.findOne({ _id: id, accountId });
    if (!doc) throw HttpError.notFound("Template not found");
    const copy = await EmailTemplateModel.create({
      ...doc.toObject(),
      _id: undefined,
      name: `${doc.name} copy`,
      createdAt: undefined,
      updatedAt: undefined,
    });
    return copy.toJSON();
  }

  async handleProviderEvent(input: {
    eventType: string;
    email?: string;
    messageId?: string;
    providerEventId: string;
    metadata?: Record<string, unknown>;
  }) {
    const existing = await EmailEventModel.findOne({
      providerEventId: input.providerEventId,
    });
    if (existing) return { duplicate: true };

    const messageId = normalizeProviderMessageId(input.messageId);
    let recipient = messageId
      ? await EmailCampaignRecipientModel.findOne({
          providerMessageId: messageId,
        })
      : null;
    if (!recipient && input.email) {
      recipient = await EmailCampaignRecipientModel.findOne({
        email: normalizeEmail(input.email),
      }).sort({ createdAt: -1 });
    }
    if (!recipient) return { ignored: true };

    const campaign = await EmailCampaignModel.findById(recipient.campaignId);
    if (!campaign) return { ignored: true };

    const type = String(input.eventType || "").toUpperCase();
    if (type === "OPEN" || type === EMAIL_EVENT_TYPE.OPENED) {
      await this.applyEngagement(
        String(campaign._id),
        String(recipient._id),
        EMAIL_EVENT_TYPE.OPENED,
      );
      return { ok: true };
    }
    if (type === "CLICK" || type === EMAIL_EVENT_TYPE.CLICKED) {
      const clickedUrl = String(
        (input.metadata as any)?.click?.link ||
          (input.metadata as any)?.link ||
          "",
      );
      await this.applyEngagement(
        String(campaign._id),
        String(recipient._id),
        EMAIL_EVENT_TYPE.CLICKED,
        clickedUrl,
      );
      return { ok: true };
    }
    if (type === EMAIL_EVENT_TYPE.DELIVERED || type === "Delivery" || type === "DELIVERY") {
      if (!recipient.deliveredAt) {
        recipient.deliveredAt = new Date();
        if (recipient.status === EMAIL_RECIPIENT_STATUS.SENT) {
          recipient.status = EMAIL_RECIPIENT_STATUS.DELIVERED;
        }
        await recipient.save();
        await EmailCampaignModel.updateOne(
          { _id: campaign._id },
          { $inc: { deliveredCount: 1 } },
        );
        await this.recordEvent({
          campaign,
          recipient,
          eventType: EMAIL_EVENT_TYPE.DELIVERED,
          providerEventId: input.providerEventId,
        });
      }
    }
    if (type === EMAIL_EVENT_TYPE.BOUNCED || type === "Bounce") {
      recipient.status = EMAIL_RECIPIENT_STATUS.BOUNCED;
      recipient.bouncedAt = new Date();
      await recipient.save();
      await EmailCampaignModel.updateOne({ _id: campaign._id }, { $inc: { bouncedCount: 1 } });
      await EmailSuppressionModel.updateOne(
        { organizationId: campaign.organizationId, email: recipient.email },
        {
          $set: {
            reason: EMAIL_SUPPRESSION_REASON.HARD_BOUNCE,
            source: "ses",
            campaignId: campaign._id,
          },
        },
        { upsert: true },
      );
      await this.recordEvent({
        campaign,
        recipient,
        eventType: EMAIL_EVENT_TYPE.BOUNCED,
        providerEventId: input.providerEventId,
      });
      await ContactModel.updateOne(
        { accountId: recipient.accountId, email: recipient.email },
        { $set: { status: "bounced" } },
      );
    }
    if (type === EMAIL_EVENT_TYPE.COMPLAINED || type === "Complaint") {
      await EmailSuppressionModel.updateOne(
        { organizationId: campaign.organizationId, email: recipient.email },
        {
          $set: {
            reason: EMAIL_SUPPRESSION_REASON.SPAM_COMPLAINT,
            source: "ses",
            campaignId: campaign._id,
          },
        },
        { upsert: true },
      );
      await EmailCampaignModel.updateOne(
        { _id: campaign._id },
        { $inc: { complainedCount: 1 } },
      );
      await this.recordEvent({
        campaign,
        recipient,
        eventType: EMAIL_EVENT_TYPE.COMPLAINED,
        providerEventId: input.providerEventId,
      });
    }
    return { ok: true };
  }

  private async applyEngagement(
    campaignId: string,
    recipientId: string,
    eventType: string,
    url?: string,
  ) {
    const recipient = await EmailCampaignRecipientModel.findById(recipientId);
    if (!recipient) {
      logger.warn("TRACKING_RECIPIENT_NOT_FOUND", { campaignId, recipientId, eventType });
      return;
    }
    const campaign = await EmailCampaignModel.findById(recipient.campaignId || campaignId);
    if (!campaign) return;

    if (eventType === EMAIL_EVENT_TYPE.OPENED && !recipient.openedAt) {
      recipient.openedAt = new Date();
      if (recipient.status === EMAIL_RECIPIENT_STATUS.SENT || recipient.status === EMAIL_RECIPIENT_STATUS.DELIVERED) {
        recipient.status = EMAIL_RECIPIENT_STATUS.OPENED;
      }
      await recipient.save();
      await EmailCampaignModel.updateOne({ _id: campaignId }, { $inc: { openedCount: 1 } });
      await this.recordEvent({ campaign, recipient, eventType });
      if (recipient.contactId) {
        await this.activityLogService.create({
          organizationId: String(campaign.organizationId),
          accountId: String(campaign.accountId),
          entityType: "contact",
          entityId: String(recipient.contactId) as any,
          action: "EMAIL_OPENED",
          actor: { type: "system", name: "Email Marketing" },
          metadata: { campaignId, campaignName: campaign.name },
        });
      }
    }

    if (eventType === EMAIL_EVENT_TYPE.CLICKED) {
      const first = !recipient.clickedAt;
      recipient.clickedAt = recipient.clickedAt || new Date();
      recipient.clickCount += 1;
      recipient.lastClickedUrl = url;
      if (first) recipient.status = EMAIL_RECIPIENT_STATUS.CLICKED;
      await recipient.save();
      await EmailCampaignModel.updateOne(
        { _id: campaignId },
        { $inc: first ? { clickedCount: 1 } : {} },
      );
      await this.recordEvent({
        campaign,
        recipient,
        eventType,
        url,
        providerEventId: `click:${recipientId}:${Date.now()}:${crypto.randomBytes(4).toString("hex")}`,
      });
      if (recipient.contactId) {
        await this.activityLogService.create({
          organizationId: String(campaign.organizationId),
          accountId: String(campaign.accountId),
          entityType: "contact",
          entityId: String(recipient.contactId) as any,
          action: "EMAIL_CLICKED",
          actor: { type: "system", name: "Email Marketing" },
          metadata: { campaignId, url },
        });
      }
    }
  }

  private async recordEvent({
    campaign,
    recipient,
    eventType,
    url,
    providerEventId,
  }: {
    campaign: any;
    recipient: any;
    eventType: string;
    url?: string;
    providerEventId?: string;
  }) {
    try {
      await EmailEventModel.create({
        organizationId: campaign.organizationId,
        accountId: campaign.accountId,
        campaignId: campaign._id,
        recipientId: recipient._id,
        leadId: recipient.leadId,
        email: recipient.email,
        eventType,
        url,
        providerEventId,
        occurredAt: new Date(),
      });
    } catch (error: any) {
      if (error?.code !== 11000) {
        logger.warn("Failed to store email event", { error: error.message });
      }
    }
  }

  private applyVars(template: string, recipient: any, organizationName: string) {
    const first = String(recipient.name || "").split(" ")[0] || PERSONALIZATION_FALLBACKS.firstName;
    const map: Record<string, string> = {
      firstName: first,
      lastName: String(recipient.name || "").split(" ").slice(1).join(" "),
      email: recipient.email || "",
      companyName: PERSONALIZATION_FALLBACKS.companyName,
      organizationName,
      name: recipient.name || first,
    };
    return String(template || "").replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const value = map[key];
      if (value === undefined || value === "") {
        return PERSONALIZATION_FALLBACKS[key] ?? "";
      }
      return value;
    });
  }

  private unwrapEmailHtml(html: string) {
    return String(html || "")
      .replace(/<!DOCTYPE[^>]*>/gi, "")
      .replace(/<head[\s\S]*?<\/head>/gi, "")
      .replace(/<\/?html[^>]*>/gi, "")
      .replace(/<\/?body[^>]*>/gi, "")
      .trim();
  }

  private async resolveTrackingRef(token: string, kind: "open" | "click" | "unsub") {
    const value = String(token || "").trim();
    if (Types.ObjectId.isValid(value) && value.length === 24) {
      const link = await EmailTrackingLinkModel.findById(value);
      if (link && link.kind === kind) {
        return {
          campaignId: String(link.campaignId),
          recipientId: String(link.recipientId),
          url: link.url,
        };
      }
    }
    const payload = verifyTrackingToken(value);
    if (!payload || payload.t !== kind) return null;
    return {
      campaignId: payload.c,
      recipientId: payload.r,
      url: payload.u,
    };
  }

  private async rewriteLinks(html: string, campaignId: string, recipientId: string) {
    const matches = Array.from(
      String(html || "").matchAll(/href=["']((?:https?:\/\/|\/\/)[^"']+)["']/gi),
    );
    let output = html;
    for (const match of matches) {
      const raw = match[1];
      const absolute = raw.startsWith("//") ? `https:${raw}` : raw;
      if (/unsubscribe/i.test(absolute) || absolute.includes("/email/u/") || absolute.includes("/email/unsubscribe")) {
        continue;
      }
      const link = await EmailTrackingLinkModel.create({
        kind: "click",
        campaignId,
        recipientId,
        url: absolute,
      });
      output = output.replace(
        match[0],
        `href="${publicApiBase()}/api/email/c/${link._id}"`,
      );
    }
    return output;
  }

  private async renderHtml(
    campaign: any,
    recipient: any,
    organizationName: string,
    isTest = false,
  ) {
    let html = this.unwrapEmailHtml(this.applyVars(campaign.html, recipient, organizationName));
    const campaignId = String(campaign._id);
    const recipientId = String(recipient._id || "test");
    const canTrack = !isTest && Types.ObjectId.isValid(recipientId) && recipientId.length === 24;
    const base = publicApiBase();

    if (canTrack) {
      html = await this.rewriteLinks(html, campaignId, recipientId);
    }

    let unsubUrl = `${base}/api/email/unsubscribe/${createTrackingToken({
      t: "unsub",
      c: campaignId,
      r: recipientId,
    })}`;
    let pixel = "";

    if (canTrack) {
      const [openLink, unsubLink] = await Promise.all([
        EmailTrackingLinkModel.create({ kind: "open", campaignId, recipientId }),
        EmailTrackingLinkModel.create({ kind: "unsub", campaignId, recipientId }),
      ]);
      unsubUrl = `${base}/api/email/u/${unsubLink._id}`;
      pixel = `<img src="${base}/api/email/o/${openLink._id}" width="1" height="1" border="0" alt="" />`;
    }

    if (!/unsubscribe/i.test(html)) {
      html += `<p style="font-size:12px;color:#71717a;margin-top:32px;">You are receiving this email because you are a contact of ${organizationName}. <a href="${unsubUrl}">Unsubscribe</a></p>`;
    } else {
      html = html.replace(/\{\{unsubscribeUrl\}\}/g, unsubUrl);
    }

    return `<!DOCTYPE html><html><body>${html}<div>${pixel}</div></body></html>`;
  }

  private async resolveAudience(
    accountId: string,
    audience: {
      mode?: string;
      contactIds?: string[];
      leadIds?: string[];
      filters?: Record<string, any>;
    },
  ) {
    const filter: Record<string, unknown> = {
      accountId,
      email: { $exists: true, $nin: [null, ""] },
    };
    const selectedIds = audience?.contactIds?.length
      ? audience.contactIds
      : audience?.leadIds;
    if ((audience?.mode === "contacts" || audience?.mode === "leads") && selectedIds?.length) {
      filter._id = { $in: selectedIds };
    }
    const filters = audience?.filters || {};
    if (filters.source) filter.source = filters.source;
    if (filters.status) filter.status = filters.status;
    if (filters.startDate || filters.endDate) {
      filter.createdAt = {
        ...(filters.startDate ? { $gte: new Date(filters.startDate) } : {}),
        ...(filters.endDate ? { $lte: new Date(filters.endDate) } : {}),
      };
    }

    const contacts = await ContactModel.find(filter)
      .select("name email source status")
      .limit(100000)
      .lean();
    return contacts.map((contact) => ({
      contactId: contact._id,
      email: normalizeEmail(contact.email),
      name: contact.name,
      status: contact.status,
    }));
  }

  private async suppressedSet(organizationId: string, emails: string[]) {
    if (!emails.length) return new Set<string>();
    const rows = await EmailSuppressionModel.find({
      organizationId,
      email: { $in: emails },
    }).select("email");
    return new Set(rows.map((row) => row.email));
  }
}

export const emailMarketingService = new EmailMarketingService();
