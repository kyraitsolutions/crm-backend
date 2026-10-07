import {
  emitToAccount,
  emitToOrganization,
} from "../../../config/wsServer/wsEmitter.js";
import { Notification } from "../../../models/notification.model.js";
import logger from "../../../utils/logger.js";
import { asEntityId } from "../../../utils/request-context.utils.js";
import { NotificationDeliveryModel } from "../models/notification-delivery.model.js";
import { NotificationPreferenceModel } from "../models/notification-preference.model.js";
import { NotificationUserSettingsModel } from "../models/notification-user-settings.model.js";
import { NotificationWorkspacePolicyModel } from "../models/notification-workspace-policy.model.js";
import { getEventType } from "../registry/event-types.registry.js";
import type {
  EventChannelPreference,
  NotificationChannel,
  UserNotificationSettings,
  WorkspaceNotificationPolicy,
} from "../types/notification-config.types.js";
import {
  eventKeyToLegacyType,
  legacyBucketHint,
  sourceToLegacyChannel,
} from "../utils/legacy-type.util.js";
import { normalizeNotificationSource } from "../utils/source.util.js";
import {
  resolvePreference,
  type PreferenceResolveResult,
} from "./preference-resolver.service.js";
import { resolveRecipients } from "./recipient-resolver.service.js";

const GROUP_WINDOW_MS = 5 * 60 * 1000;
const DEDUPE_WINDOW_MS = 5 * 60 * 1000;

export type NotificationDispatchInput = {
  eventKey: string;
  organizationId: string;
  accountId: string;
  source?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  actorId?: string | null;
  assigneeId?: string | null;
  ownerId?: string | null;
  leadScore?: number | null;
  title: string;
  body: string;
  deepLink?: string | null;
  groupKey?: string | null;
  /** Legacy typeId used for inbox grouping / upsert key. */
  typeId?: string | null;
  payload?: Record<string, unknown>;
  recipientUserIds?: string[];
  isPriority?: boolean;
  channels?: NotificationChannel[];
};

type DeliveryWrite = {
  organizationId: string;
  notificationId?: string | null;
  recipientUserId: string;
  eventKey: string;
  channel: NotificationChannel;
  status: "sent" | "failed" | "skipped" | "queued";
  skipReason?: string | null;
  error?: string | null;
  dedupeKey: string;
  meta?: Record<string, unknown>;
};

function buildDedupeKey(parts: {
  organizationId: string;
  eventKey: string;
  entityKey: string;
  userId: string;
  channel: NotificationChannel;
  now: Date;
}): string {
  const bucket = Math.floor(parts.now.getTime() / DEDUPE_WINDOW_MS);
  return [
    parts.organizationId,
    parts.eventKey,
    parts.entityKey,
    parts.userId,
    parts.channel,
    String(bucket),
  ].join(":");
}

async function loadPreferenceBundle(
  organizationId: string,
  userIds: string[],
  eventKey: string,
) {
  const [settingsRows, preferenceRows, workspacePolicy] = await Promise.all([
    NotificationUserSettingsModel.find({
      organizationId,
      userId: { $in: userIds },
    }).lean(),
    NotificationPreferenceModel.find({
      organizationId,
      userId: { $in: userIds },
      eventKey,
    }).lean(),
    NotificationWorkspacePolicyModel.findOne({ organizationId }).lean(),
  ]);

  const settingsByUser = new Map<string, UserNotificationSettings>();
  for (const row of settingsRows) {
    settingsByUser.set(String(row.userId), {
      organizationId: String(row.organizationId),
      userId: String(row.userId),
      inAppEnabled: row.inAppEnabled !== false,
      emailEnabled: row.emailEnabled !== false,
      emailMode: row.emailMode || "instant",
      quietHours: row.quietHours || {
        enabled: false,
        start: "22:00",
        end: "08:00",
        timezone: "Asia/Kolkata",
      },
      timezone: row.timezone || "Asia/Kolkata",
    });
  }

  const prefByUserChannel = new Map<
    string,
    Pick<EventChannelPreference, "enabled" | "filters">
  >();
  for (const row of preferenceRows) {
    prefByUserChannel.set(`${String(row.userId)}:${row.channel}`, {
      enabled: row.enabled !== false,
      filters: (row.filters || {}) as EventChannelPreference["filters"],
    });
  }

  return {
    settingsByUser,
    prefByUserChannel,
    workspacePolicy: workspacePolicy as WorkspaceNotificationPolicy | null,
  };
}

async function writeDeliveries(
  rows: DeliveryWrite[],
): Promise<Map<string, string>> {
  const idByDedupe = new Map<string, string>();
  if (!rows.length) return idByDedupe;

  try {
    const inserted = await NotificationDeliveryModel.insertMany(
      rows.map((row) => ({
        organizationId: row.organizationId,
        notificationId: row.notificationId || null,
        recipientUserId: row.recipientUserId,
        eventKey: row.eventKey,
        channel: row.channel,
        status: row.status,
        skipReason: row.skipReason || null,
        error: row.error || null,
        attempts: row.status === "sent" || row.status === "queued" ? 1 : 0,
        dedupeKey: row.dedupeKey,
        meta: row.meta || {},
        sentAt: row.status === "sent" ? new Date() : null,
      })),
      { ordered: false },
    );
    for (const doc of inserted) {
      if (doc.dedupeKey) {
        idByDedupe.set(String(doc.dedupeKey), String(doc._id));
      }
    }
  } catch (error) {
    // Duplicate dedupe keys or races should not fail dispatch.
    logger.warn("Notification delivery write partially failed", {
      error: error instanceof Error ? error.message : String(error),
      count: rows.length,
    });
    // Best-effort lookup for rows that did insert
    const keys = rows.map((row) => row.dedupeKey);
    const found = await NotificationDeliveryModel.find({
      dedupeKey: { $in: keys },
    })
      .select("_id dedupeKey")
      .lean();
    for (const doc of found) {
      if (doc.dedupeKey) {
        idByDedupe.set(String(doc.dedupeKey), String(doc._id));
      }
    }
  }

  return idByDedupe;
}

async function upsertInboxNotification(input: {
  organizationId: string;
  accountId: string;
  eventKey: string;
  typeId: string;
  title: string;
  body: string;
  source: string | null;
  entityType?: string | null;
  entityId?: string | null;
  deepLink?: string | null;
  groupKey: string;
  groupable: boolean;
  isPriority?: boolean;
  recipientId?: string | null;
  meta?: Record<string, unknown>;
  now: Date;
}) {
  const event = getEventType(input.eventKey);
  const legacyType =
    legacyBucketHint(event) || eventKeyToLegacyType(input.eventKey);
  const channelType = sourceToLegacyChannel(input.source);
  const priority = event?.critical
    ? "critical"
    : input.isPriority
      ? "high"
      : "normal";

  const setFields = {
    title: input.title,
    description: input.body,
    channelType,
    accountId: input.accountId,
    meta: input.meta || {},
    updatedAt: input.now,
    isRead: false,
    readAt: null,
    eventKey: input.eventKey,
    module: event?.module || null,
    entityType: input.entityType || null,
    entityId: input.entityId || null,
    deepLink: input.deepLink || null,
    source: input.source,
    groupKey: input.groupKey,
    priority,
    isPriority: Boolean(input.isPriority || event?.critical),
    recipientId: input.recipientId || null,
    type: legacyType,
  };

  if (input.groupable) {
    const since = new Date(input.now.getTime() - GROUP_WINDOW_MS);
    const grouped = await Notification.findOneAndUpdate(
      {
        organizationId: input.organizationId,
        groupKey: input.groupKey,
        createdAt: { $gte: since },
      },
      {
        $set: setFields,
        $inc: { unreadCount: 1 },
      },
      { new: true },
    );
    if (grouped) {
      return grouped.toJSON() as Record<string, unknown>;
    }
  }

  const upserted = await Notification.findOneAndUpdate(
    {
      organizationId: input.organizationId,
      type: legacyType,
      typeId: input.typeId,
    },
    {
      $set: setFields,
      $inc: { unreadCount: 1 },
      $setOnInsert: {
        organizationId: input.organizationId,
        typeId: input.typeId,
        createdAt: input.now,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );

  return upserted?.toJSON() as Record<string, unknown>;
}

export class NotificationDispatchService {
  async dispatch(
    input: NotificationDispatchInput,
  ): Promise<Record<string, unknown> | null> {
    const organizationId = asEntityId(input.organizationId);
    const accountId = asEntityId(input.accountId);
    if (!organizationId || !accountId) {
      logger.warn("Skipped notification dispatch, missing tenant ids", {
        eventKey: input.eventKey,
        organizationId,
        accountId,
      });
      return null;
    }

    const event = getEventType(input.eventKey);
    if (!event) {
      logger.warn("Skipped notification dispatch, unknown event", {
        eventKey: input.eventKey,
      });
      return null;
    }

    const now = new Date();
    const source = normalizeNotificationSource(input.source);
    const entityKey =
      asEntityId(input.entityId) ||
      asEntityId(input.typeId) ||
      input.eventKey;
    const typeId = asEntityId(input.typeId) || entityKey;
    const groupKey =
      input.groupKey ||
      `${input.eventKey}:${entityKey}`;

    const recipientUserIds = await resolveRecipients({
      organizationId,
      accountId,
      strategy: event.recipientStrategy,
      assigneeId: input.assigneeId,
      ownerId: input.ownerId,
      recipientUserIds: input.recipientUserIds,
    });

    const channels: NotificationChannel[] =
      input.channels?.length
        ? input.channels
        : (["in_app", "email"] as NotificationChannel[]);

    const deliveries: DeliveryWrite[] = [];
    let anyInAppAllowed = false;
    let soleInAppRecipient: string | null = null;
    let inAppAllowCount = 0;

    // Backward compatible: no account members yet → still deliver org inbox once.
    if (!recipientUserIds.length) {
      anyInAppAllowed = channels.includes("in_app");
      logger.warn("Notification dispatch falling back to org broadcast", {
        eventKey: input.eventKey,
        organizationId,
        accountId,
      });
    } else {
      const { settingsByUser, prefByUserChannel, workspacePolicy } =
        await loadPreferenceBundle(
          organizationId,
          recipientUserIds,
          input.eventKey,
        );

      const { notificationMuteService } = await import(
        "./notification-mute.service.js"
      );
      const mutedUserIds = await notificationMuteService.findMutedUserIds({
        organizationId,
        userIds: recipientUserIds,
        entityType: input.entityType,
        entityId: input.entityId,
        now,
      });

      for (const userId of recipientUserIds) {
        for (const channel of channels) {
          const dedupeKey = buildDedupeKey({
            organizationId,
            eventKey: input.eventKey,
            entityKey,
            userId,
            channel,
            now,
          });

          const existing = await NotificationDeliveryModel.exists({
            dedupeKey,
            status: { $in: ["sent", "queued"] },
          });
          if (existing) {
            deliveries.push({
              organizationId,
              recipientUserId: userId,
              eventKey: input.eventKey,
              channel,
              status: "skipped",
              skipReason: "deduped",
              dedupeKey: `${dedupeKey}:dup`,
            });
            continue;
          }

          const decision: PreferenceResolveResult = resolvePreference({
            context: {
              eventKey: input.eventKey,
              channel,
              source,
              assigneeId: input.assigneeId ?? null,
              recipientUserId: userId,
              leadScore: input.leadScore ?? null,
              muted: mutedUserIds.has(userId),
              now,
            },
            userSettings: settingsByUser.get(userId) || null,
            preference: prefByUserChannel.get(`${userId}:${channel}`) || null,
            workspacePolicy,
          });

          if (!decision.allow) {
            deliveries.push({
              organizationId,
              recipientUserId: userId,
              eventKey: input.eventKey,
              channel,
              status: "skipped",
              skipReason: decision.skipReason || "blocked",
              dedupeKey,
            });
            continue;
          }

          if (channel === "in_app") {
            anyInAppAllowed = true;
            inAppAllowCount += 1;
            soleInAppRecipient = userId;
            deliveries.push({
              organizationId,
              recipientUserId: userId,
              eventKey: input.eventKey,
              channel,
              status: "sent",
              dedupeKey,
              meta: { criticalBypass: Boolean(decision.criticalBypass) },
            });
            continue;
          }

          // Email channel — instant enqueue after persist; digest waits for scheduler.
          deliveries.push({
            organizationId,
            recipientUserId: userId,
            eventKey: input.eventKey,
            channel,
            status: "queued",
            skipReason: decision.deferDigest
              ? `email_digest_${decision.deferDigest}`
              : null,
            dedupeKey,
            meta: {
              deferDigest: decision.deferDigest || null,
              title: input.title,
              body: input.body,
              deepLink: input.deepLink || null,
              accountId,
              instant: !decision.deferDigest,
            },
          });
        }
      }
    }

    let notification: Record<string, unknown> | null = null;

    if (anyInAppAllowed) {
      notification = await upsertInboxNotification({
        organizationId,
        accountId,
        eventKey: input.eventKey,
        typeId,
        title: input.title,
        body: input.body,
        source,
        entityType: input.entityType,
        entityId: input.entityId,
        deepLink: input.deepLink,
        groupKey,
        groupable: Boolean(event.groupable),
        isPriority: input.isPriority,
        recipientId: inAppAllowCount === 1 ? soleInAppRecipient : null,
        meta: {
          ...(input.payload || {}),
          eventKey: input.eventKey,
          source,
          entityType: input.entityType,
          entityId: input.entityId,
        },
        now,
      });

      const notificationId = String(
        (notification as { id?: string })?.id || "",
      );

      for (const row of deliveries) {
        if (row.status === "sent" || row.status === "queued") {
          row.notificationId = notificationId || null;
        }
      }

      const eventPayload = { notification };
      emitToOrganization({
        organizationId,
        accountId,
        event: "NEW_NOTIFICATION",
        data: eventPayload,
      });
      emitToAccount(accountId, "NEW_NOTIFICATION", eventPayload);
    }

    const deliveryIds = await writeDeliveries(deliveries);

    // Enqueue instant notification emails (system SES sender).
    const instantEmailRows = deliveries.filter(
      (row) =>
        row.channel === "email" &&
        row.status === "queued" &&
        !row.skipReason &&
        row.meta?.instant === true,
    );

    if (instantEmailRows.length) {
      try {
        const { notificationEmailService } = await import(
          "./notification-email.service.js"
        );
        await Promise.all(
          instantEmailRows.map(async (row) => {
            const deliveryId = deliveryIds.get(row.dedupeKey);
            if (!deliveryId) return;
            await notificationEmailService.enqueueInstant({
              deliveryId,
              organizationId,
              accountId,
              recipientUserId: row.recipientUserId,
              eventKey: row.eventKey,
              title: String(row.meta?.title || input.title),
              body: String(row.meta?.body || input.body),
              deepLink:
                typeof row.meta?.deepLink === "string"
                  ? row.meta.deepLink
                  : input.deepLink,
            });
          }),
        );
      } catch (error) {
        logger.warn("Notification email enqueue failed", {
          error: error instanceof Error ? error.message : String(error),
          eventKey: input.eventKey,
        });
      }
    }

    return notification;
  }
}

export const notificationDispatchService = new NotificationDispatchService();
