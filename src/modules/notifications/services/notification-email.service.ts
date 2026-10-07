import { ENV } from "../../../constants/env.constants.js";
import { QUEUE_JOBS } from "../../../constants/queue-jobs.constant.js";
import { UserModel } from "../../../models/user.model.js";
import { UserProfileModel } from "../../../models/userProfile.model.js";
import { emailQueue } from "../../../queue/queue.js";
import logger from "../../../utils/logger.js";
import { NotificationDeliveryModel } from "../models/notification-delivery.model.js";
import { NotificationUserSettingsModel } from "../models/notification-user-settings.model.js";
import { getEventType } from "../registry/event-types.registry.js";

export type NotificationEmailPayload = {
  deliveryId: string;
  organizationId: string;
  accountId: string;
  recipientUserId: string;
  eventKey: string;
  title: string;
  body: string;
  deepLink?: string | null;
};

function frontendBaseUrl() {
  return String(ENV.URL.FRONTEND_URL || "").replace(/\/$/, "");
}

export function resolveDeepLinkUrl(deepLink?: string | null) {
  if (!deepLink) return "";
  if (/^https?:\/\//i.test(deepLink)) return deepLink;
  const base = frontendBaseUrl();
  if (!base) return deepLink;
  const path = deepLink.startsWith("/") ? deepLink : `/${deepLink}`;
  return `${base}${path}`;
}

export function moduleLabelForEvent(eventKey: string) {
  const event = getEventType(eventKey);
  if (!event) return "Notification";
  return event.module.charAt(0).toUpperCase() + event.module.slice(1);
}

async function recipientProfile(userId: string) {
  const [user, profile] = await Promise.all([
    UserModel.findById(userId).select("email").lean(),
    UserProfileModel.findOne({ userId }).select("firstName lastName").lean(),
  ]);
  const email = String(user?.email || "").trim();
  const name = [profile?.firstName, profile?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return { email, name: name || "there" };
}

export class NotificationEmailService {
  async enqueueInstant(payload: NotificationEmailPayload) {
    await emailQueue.add(
      QUEUE_JOBS.NOTIFICATION_EMAIL,
      payload,
      {
        attempts: 5,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: 50,
        removeOnFail: 30,
      },
    );
  }

  async sendInstant(payload: NotificationEmailPayload) {
    const delivery = await NotificationDeliveryModel.findById(payload.deliveryId);
    if (!delivery) {
      logger.warn("Notification email skipped, delivery missing", {
        deliveryId: payload.deliveryId,
      });
      return;
    }
    if (delivery.status === "sent") return;
    if (delivery.channel !== "email") return;

    const { email, name } = await recipientProfile(payload.recipientUserId);
    if (!email) {
      await NotificationDeliveryModel.updateOne(
        { _id: payload.deliveryId },
        {
          $set: {
            status: "failed",
            error: "recipient_email_missing",
            skipReason: "recipient_email_missing",
          },
          $inc: { attempts: 1 },
        },
      );
      return;
    }

    const { EmailUtils } = await import("../../../utils/email.utils.js");
    const emailUtils = new EmailUtils();
    const ok = await emailUtils.sendSystemNotificationEmail(email, {
      title: payload.title,
      body: payload.body,
      recipientName: name,
      moduleLabel: moduleLabelForEvent(payload.eventKey),
      deepLinkUrl: resolveDeepLinkUrl(payload.deepLink),
    });

    if (!ok) {
      await NotificationDeliveryModel.updateOne(
        { _id: payload.deliveryId },
        {
          $set: {
            status: "failed",
            error: "email_send_failed",
          },
          $inc: { attempts: 1 },
        },
      );
      throw new Error(`Failed to send notification email to ${email}`);
    }

    await NotificationDeliveryModel.updateOne(
      { _id: payload.deliveryId },
      {
        $set: {
          status: "sent",
          skipReason: null,
          error: null,
          sentAt: new Date(),
        },
        $inc: { attempts: 1 },
      },
    );
  }

  /**
   * Flush queued digest deliveries. Called by the hourly digest worker.
   * - hourly: flush all pending hourly digests
   * - daily: flush when local hour is 8 (recipient timezone) or item age >= 24h
   */
  async flushDigests(now = new Date()) {
    const pending = await NotificationDeliveryModel.find({
      channel: "email",
      status: "queued",
      skipReason: { $in: ["email_digest_hourly", "email_digest_daily"] },
    })
      .sort({ createdAt: 1 })
      .limit(500)
      .lean();

    if (!pending.length) return { groups: 0, sent: 0 };

    type Row = (typeof pending)[number];
    const byUser = new Map<string, Row[]>();
    for (const row of pending) {
      const key = `${String(row.organizationId)}:${String(row.recipientUserId)}:${row.skipReason}`;
      (byUser.get(key) || byUser.set(key, []).get(key)!).push(row);
    }

    let groups = 0;
    let sent = 0;

    for (const [key, rows] of byUser) {
      const [, userId, skipReason] = key.split(":");
      const mode = skipReason === "email_digest_daily" ? "daily" : "hourly";

      if (mode === "daily") {
        const settings = await NotificationUserSettingsModel.findOne({
          organizationId: rows[0].organizationId,
          userId,
        })
          .select("timezone quietHours.timezone")
          .lean();
        const tz =
          settings?.timezone ||
          settings?.quietHours?.timezone ||
          "Asia/Kolkata";
        const hour = localHour(now, tz);
        const oldest = rows[0].createdAt
          ? new Date(rows[0].createdAt).getTime()
          : 0;
        const ageMs = now.getTime() - oldest;
        const readyByAge = ageMs >= 23 * 60 * 60 * 1000;
        if (hour !== 8 && !readyByAge) continue;
      }

      groups += 1;
      const ok = await this.sendDigestGroup(userId, mode, rows);
      if (ok) sent += 1;
    }

    logger.info("Notification digest flush complete", { groups, sent });
    return { groups, sent };
  }

  private async sendDigestGroup(
    userId: string,
    mode: "hourly" | "daily",
    rows: Array<{
      _id: unknown;
      eventKey: string;
      meta?: Record<string, unknown> | null;
    }>,
  ) {
    const { email, name } = await recipientProfile(userId);
    const ids = rows.map((row) => row._id);

    if (!email) {
      await NotificationDeliveryModel.updateMany(
        { _id: { $in: ids } },
        {
          $set: {
            status: "failed",
            error: "recipient_email_missing",
            skipReason: "recipient_email_missing",
          },
          $inc: { attempts: 1 },
        },
      );
      return false;
    }

    const items = rows.map((row) => {
      const meta = (row.meta || {}) as Record<string, unknown>;
      return {
        title: String(meta.title || row.eventKey),
        body: String(meta.body || ""),
        moduleLabel: moduleLabelForEvent(row.eventKey),
        deepLinkUrl: resolveDeepLinkUrl(
          typeof meta.deepLink === "string" ? meta.deepLink : null,
        ),
      };
    });

    const { EmailUtils } = await import("../../../utils/email.utils.js");
    const emailUtils = new EmailUtils();
    const ok = await emailUtils.sendNotificationDigestEmail(email, {
      recipientName: name,
      digestMode: mode,
      items,
      settingsUrl: resolveDeepLinkUrl("/dashboard/settings/notifications"),
    });

    if (!ok) {
      await NotificationDeliveryModel.updateMany(
        { _id: { $in: ids } },
        {
          $set: { status: "failed", error: "digest_send_failed" },
          $inc: { attempts: 1 },
        },
      );
      return false;
    }

    await NotificationDeliveryModel.updateMany(
      { _id: { $in: ids } },
      {
        $set: {
          status: "sent",
          skipReason: null,
          error: null,
          sentAt: new Date(),
        },
        $inc: { attempts: 1 },
      },
    );
    return true;
  }

  async ensureDigestScheduler() {
    const existing = await emailQueue.getRepeatableJobs();
    const already = existing.some(
      (job) => job.name === QUEUE_JOBS.NOTIFICATION_EMAIL_DIGEST,
    );
    if (already) return;

    await emailQueue.add(
      QUEUE_JOBS.NOTIFICATION_EMAIL_DIGEST,
      { source: "scheduler" },
      {
        repeat: { every: 60 * 60 * 1000 }, // hourly
        jobId: "notification-email-digest-repeat",
        removeOnComplete: true,
        removeOnFail: 20,
      },
    );
    logger.info("Notification digest scheduler registered");
  }
}

function localHour(now: Date, timeZone: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      hour12: false,
    }).formatToParts(now);
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
    return hour % 24;
  } catch {
    return now.getUTCHours();
  }
}

export const notificationEmailService = new NotificationEmailService();
