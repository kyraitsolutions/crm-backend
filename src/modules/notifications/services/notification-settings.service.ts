import { ROLES } from "../../../config/permissions.js";
import { HttpError } from "../../../utils/http.error.js";
import { NotificationDeliveryModel } from "../models/notification-delivery.model.js";
import { NotificationPreferenceModel } from "../models/notification-preference.model.js";
import { NotificationUserSettingsModel } from "../models/notification-user-settings.model.js";
import { NotificationWorkspacePolicyModel } from "../models/notification-workspace-policy.model.js";
import {
  getEventTypesByModule,
  NOTIFICATION_EVENT_TYPES,
} from "../registry/event-types.registry.js";
import type {
  EmailDigestMode,
  EventChannelPreference,
  NotificationChannel,
  PreferenceFilters,
  QuietHours,
  UserNotificationSettings,
  WorkspaceNotificationPolicy,
} from "../types/notification-config.types.js";
import {
  expandLegacyToggles,
  type LegacyToggleState,
} from "../utils/legacy-toggle.util.js";
import { notificationDispatchService } from "./notification-dispatch.service.js";

const DEFAULT_QUIET: QuietHours = {
  enabled: false,
  start: "22:00",
  end: "08:00",
  timezone: "Asia/Kolkata",
};

type PreferenceUpsert = {
  eventKey: string;
  channel: NotificationChannel;
  enabled: boolean;
  filters?: PreferenceFilters;
};

function asSettingsDoc(
  organizationId: string,
  userId: string,
  row: any | null,
): UserNotificationSettings {
  return {
    organizationId,
    userId,
    inAppEnabled: row?.inAppEnabled !== false,
    emailEnabled: row?.emailEnabled !== false,
    emailMode: (row?.emailMode as EmailDigestMode) || "instant",
    quietHours: {
      enabled: Boolean(row?.quietHours?.enabled),
      start: row?.quietHours?.start || DEFAULT_QUIET.start,
      end: row?.quietHours?.end || DEFAULT_QUIET.end,
      timezone:
        row?.quietHours?.timezone || row?.timezone || DEFAULT_QUIET.timezone,
    },
    timezone: row?.timezone || DEFAULT_QUIET.timezone,
  };
}

function defaultPreference(
  organizationId: string,
  userId: string,
  eventKey: string,
  channel: NotificationChannel,
): EventChannelPreference {
  const event = NOTIFICATION_EVENT_TYPES.find((e) => e.key === eventKey);
  return {
    organizationId,
    userId,
    eventKey,
    channel,
    enabled: Boolean(event?.defaultChannels.includes(channel)),
    filters: {},
  };
}

export class NotificationSettingsService {
  getCatalog() {
    const byModule = getEventTypesByModule();
    const modules = Object.keys(byModule).map((module) => ({
      module,
      label: module.charAt(0).toUpperCase() + module.slice(1),
      events: byModule[module],
    }));
    return {
      modules,
      channels: ["in_app", "email"] as NotificationChannel[],
      sources: [
        "meta_ads",
        "google_ads",
        "website_form",
        "chatbot",
        "whatsapp",
        "instagram",
        "manual",
        "import",
        "api",
      ],
    };
  }

  async getSettings(organizationId: string, userId: string) {
    const row = await NotificationUserSettingsModel.findOne({
      organizationId,
      userId,
    }).lean();
    return asSettingsDoc(organizationId, userId, row);
  }

  async updateSettings(
    organizationId: string,
    userId: string,
    patch: Partial<{
      inAppEnabled: boolean;
      emailEnabled: boolean;
      emailMode: EmailDigestMode;
      quietHours: Partial<QuietHours>;
      timezone: string;
    }>,
  ) {
    const current = await this.getSettings(organizationId, userId);
    const nextQuiet: QuietHours = {
      ...current.quietHours,
      ...(patch.quietHours || {}),
      timezone:
        patch.quietHours?.timezone ||
        patch.timezone ||
        current.quietHours.timezone,
    };

    const updated = await NotificationUserSettingsModel.findOneAndUpdate(
      { organizationId, userId },
      {
        $set: {
          inAppEnabled:
            typeof patch.inAppEnabled === "boolean"
              ? patch.inAppEnabled
              : current.inAppEnabled,
          emailEnabled:
            typeof patch.emailEnabled === "boolean"
              ? patch.emailEnabled
              : current.emailEnabled,
          emailMode: patch.emailMode || current.emailMode,
          quietHours: nextQuiet,
          timezone: patch.timezone || current.timezone,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();

    return asSettingsDoc(organizationId, userId, updated);
  }

  async getPreferences(organizationId: string, userId: string) {
    const rows = await NotificationPreferenceModel.find({
      organizationId,
      userId,
    }).lean();

    const map = new Map<string, EventChannelPreference>();
    for (const row of rows) {
      map.set(`${row.eventKey}:${row.channel}`, {
        organizationId: String(row.organizationId),
        userId: String(row.userId),
        eventKey: row.eventKey,
        channel: row.channel as NotificationChannel,
        enabled: row.enabled !== false,
        filters: (row.filters || {}) as PreferenceFilters,
      });
    }

    const preferences: EventChannelPreference[] = [];
    for (const event of NOTIFICATION_EVENT_TYPES) {
      for (const channel of ["in_app", "email"] as NotificationChannel[]) {
        preferences.push(
          map.get(`${event.key}:${channel}`) ||
            defaultPreference(organizationId, userId, event.key, channel),
        );
      }
    }
    return preferences;
  }

  async upsertPreferences(
    organizationId: string,
    userId: string,
    items: PreferenceUpsert[],
  ) {
    if (!Array.isArray(items) || !items.length) {
      throw HttpError.badRequest("preferences array is required");
    }

    const known = new Set(NOTIFICATION_EVENT_TYPES.map((e) => e.key));
    const ops = [];

    for (const item of items) {
      if (!known.has(item.eventKey)) {
        throw HttpError.badRequest(`Unknown eventKey: ${item.eventKey}`);
      }
      if (item.channel !== "in_app" && item.channel !== "email") {
        throw HttpError.badRequest(`Invalid channel: ${item.channel}`);
      }

      const event = NOTIFICATION_EVENT_TYPES.find((e) => e.key === item.eventKey)!;
      // Critical events cannot be disabled by the user
      const enabled = event.critical ? true : Boolean(item.enabled);

      ops.push({
        updateOne: {
          filter: {
            organizationId,
            userId,
            eventKey: item.eventKey,
            channel: item.channel,
          },
          update: {
            $set: {
              enabled,
              filters: item.filters || {},
            },
          },
          upsert: true,
        },
      });
    }

    if (ops.length) {
      await NotificationPreferenceModel.bulkWrite(ops, { ordered: false });
    }

    return this.getPreferences(organizationId, userId);
  }

  async applyPreset(
    organizationId: string,
    userId: string,
    preset: "recommended" | "quiet" | "everything",
  ) {
    const items: PreferenceUpsert[] = [];

    for (const event of NOTIFICATION_EVENT_TYPES) {
      for (const channel of ["in_app", "email"] as NotificationChannel[]) {
        let enabled = event.defaultChannels.includes(channel);

        if (preset === "everything") {
          enabled = true;
        } else if (preset === "quiet") {
          const keep =
            event.critical ||
            event.key === "lead.assigned" ||
            event.key === "conversation.intervention_requested" ||
            event.key === "system.whatsapp_disconnected" ||
            event.key === "system.gmail_token_expired";
          enabled = keep && (channel === "in_app" || event.critical);
        } else {
          // recommended = registry defaults
          enabled = event.defaultChannels.includes(channel);
        }

        if (event.critical) enabled = true;

        items.push({
          eventKey: event.key,
          channel,
          enabled,
          filters: {},
        });
      }
    }

    if (preset === "quiet") {
      await this.updateSettings(organizationId, userId, {
        emailMode: "daily",
        quietHours: {
          enabled: true,
          start: "21:00",
          end: "09:00",
          timezone: "Asia/Kolkata",
        },
      });
    } else if (preset === "everything") {
      await this.updateSettings(organizationId, userId, {
        inAppEnabled: true,
        emailEnabled: true,
        emailMode: "instant",
        quietHours: { enabled: false },
      });
    } else {
      await this.updateSettings(organizationId, userId, {
        inAppEnabled: true,
        emailEnabled: true,
        emailMode: "instant",
      });
    }

    const preferences = await this.upsertPreferences(
      organizationId,
      userId,
      items,
    );
    const settings = await this.getSettings(organizationId, userId);
    return { preset, settings, preferences };
  }

  async sendTest(
    organizationId: string,
    accountId: string,
    userId: string,
  ) {
    if (!accountId) {
      throw HttpError.badRequest("accountId is required for test notification");
    }

    const notification = await notificationDispatchService.dispatch({
      eventKey: "lead.created",
      organizationId,
      accountId,
      source: "manual",
      entityType: "lead",
      entityId: `test-${userId}`,
      typeId: `test-notification:${Date.now()}:${userId}`,
      recipientUserIds: [userId],
      title: "Test notification",
      body: "This is a test from Notification Settings. Check in-app and email.",
      deepLink: "/dashboard/settings/notifications",
      payload: { kind: "test_notification" },
      isPriority: false,
      channels: ["in_app", "email"],
    });

    return { notification };
  }

  async getWorkspacePolicy(organizationId: string) {
    const row = await NotificationWorkspacePolicyModel.findOne({
      organizationId,
    }).lean();

    const policy: WorkspaceNotificationPolicy = {
      organizationId,
      channels: row?.channels?.length
        ? (row.channels as WorkspaceNotificationPolicy["channels"])
        : [
            {
              channel: "in_app",
              locked: false,
              forcedEnabled: null,
              disabled: false,
            },
            {
              channel: "email",
              locked: false,
              forcedEnabled: null,
              disabled: false,
            },
          ],
      lockedEventKeys: row?.lockedEventKeys || [],
    };
    return policy;
  }

  async updateWorkspacePolicy(
    organizationId: string,
    roleName: string | undefined,
    patch: Partial<WorkspaceNotificationPolicy>,
  ) {
    if (roleName !== ROLES.OWNER && roleName !== ROLES.ADMIN) {
      throw HttpError.forbidden("Only admins can update workspace policy");
    }

    const updated = await NotificationWorkspacePolicyModel.findOneAndUpdate(
      { organizationId },
      {
        $set: {
          channels: patch.channels || [],
          lockedEventKeys: patch.lockedEventKeys || [],
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();

    return {
      organizationId,
      channels: updated?.channels || [],
      lockedEventKeys: updated?.lockedEventKeys || [],
    } as WorkspaceNotificationPolicy;
  }

  async migrateLegacyToggles(
    organizationId: string,
    userId: string,
    toggles: LegacyToggleState,
  ) {
    const criticalKeys = new Set(
      NOTIFICATION_EVENT_TYPES.filter((e) => e.critical).map((e) => e.key),
    );
    const items = expandLegacyToggles(toggles || {}, criticalKeys);
    if (!items.length) {
      throw HttpError.badRequest("No legacy toggles provided");
    }
    const preferences = await this.upsertPreferences(
      organizationId,
      userId,
      items,
    );
    return { migrated: items.length, preferences };
  }

  async getDeliveryDebug(
    organizationId: string,
    userId: string,
    eventKey?: string,
    limit = 50,
  ) {
    const filter: Record<string, unknown> = {
      organizationId,
      recipientUserId: userId,
    };
    if (eventKey) filter.eventKey = eventKey;

    const rows = await NotificationDeliveryModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 100))
      .lean();

    return {
      docs: rows.map((row) => ({
        id: String(row._id),
        eventKey: row.eventKey,
        channel: row.channel,
        status: row.status,
        skipReason: row.skipReason,
        error: row.error,
        notificationId: row.notificationId
          ? String(row.notificationId)
          : null,
        createdAt: row.createdAt,
        sentAt: row.sentAt,
        meta: row.meta,
      })),
    };
  }
}

export const notificationSettingsService = new NotificationSettingsService();
