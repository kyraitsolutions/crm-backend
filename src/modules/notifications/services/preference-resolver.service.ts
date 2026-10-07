import { getEventType } from "../registry/event-types.registry.js";
import type {
  EmailDigestMode,
  EventChannelPreference,
  NotificationChannel,
  PreferenceFilters,
  QuietHours,
  ResolveContext,
  ResolveDecision,
  UserNotificationSettings,
  WorkspaceChannelPolicy,
  WorkspaceNotificationPolicy,
} from "../types/notification-config.types.js";

export type PreferenceResolverInput = {
  context: ResolveContext;
  userSettings: Pick<
    UserNotificationSettings,
    "inAppEnabled" | "emailEnabled" | "emailMode" | "quietHours" | "timezone"
  > | null;
  preference: Pick<EventChannelPreference, "enabled" | "filters"> | null;
  workspacePolicy: WorkspaceNotificationPolicy | null;
  /** Optional throttle signal from caller (e.g. recent deliveries). */
  throttleExceeded?: boolean;
};

export type PreferenceResolveResult = ResolveDecision & {
  /** When email should go to digest instead of instant send. */
  deferDigest?: Exclude<EmailDigestMode, "instant"> | null;
};

function channelGloballyEnabled(
  channel: NotificationChannel,
  settings: PreferenceResolverInput["userSettings"],
): boolean {
  if (!settings) return true;
  return channel === "in_app" ? settings.inAppEnabled : settings.emailEnabled;
}

function findChannelPolicy(
  policy: WorkspaceNotificationPolicy | null,
  channel: NotificationChannel,
): WorkspaceChannelPolicy | null {
  if (!policy?.channels?.length) return null;
  return policy.channels.find((row) => row.channel === channel) ?? null;
}

/** Parse "HH:mm" into minutes from midnight. Returns null if invalid. */
export function parseTimeToMinutes(value: string): number | null {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * Quiet hours spanning midnight (e.g. 22:00–08:00) are supported.
 * Uses wall-clock minutes in the provided timezone when possible.
 */
export function isWithinQuietHours(
  quietHours: QuietHours | null | undefined,
  now: Date,
  fallbackTimezone?: string,
): boolean {
  if (!quietHours?.enabled) return false;

  const start = parseTimeToMinutes(quietHours.start);
  const end = parseTimeToMinutes(quietHours.end);
  if (start === null || end === null) return false;
  if (start === end) return true; // 24h quiet window

  const tz = quietHours.timezone || fallbackTimezone || "UTC";
  let minutes: number;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    }).formatToParts(now);
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
    const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
    // Intl may return "24" for midnight in some environments
    minutes = (hour % 24) * 60 + minute;
  } catch {
    minutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  }

  if (start < end) {
    return minutes >= start && minutes < end;
  }
  // Overnight window
  return minutes >= start || minutes < end;
}

function filtersBlock(
  filters: PreferenceFilters | null | undefined,
  context: ResolveContext,
): string | null {
  if (!filters) return null;

  if (filters.sources?.length) {
    const source = (context.source || "").toLowerCase();
    const allowed = filters.sources.map((s) => s.toLowerCase());
    if (!source || !allowed.includes(source)) {
      return "source_filtered";
    }
  }

  if (filters.assigned_to_me) {
    if (
      !context.assigneeId ||
      context.assigneeId !== context.recipientUserId
    ) {
      return "assigned_to_me_mismatch";
    }
  }

  if (filters.unassigned_only) {
    if (context.assigneeId) {
      return "unassigned_only_mismatch";
    }
  }

  if (
    typeof filters.min_lead_score === "number" &&
    Number.isFinite(filters.min_lead_score)
  ) {
    const score =
      typeof context.leadScore === "number" ? context.leadScore : null;
    if (score === null || score < filters.min_lead_score) {
      return "min_lead_score";
    }
  }

  return null;
}

/**
 * Pure preference resolution. A notification is delivered only if every gate passes.
 * Critical events bypass user disables and quiet hours (not workspace channel disable).
 */
export function resolvePreference(
  input: PreferenceResolverInput,
): PreferenceResolveResult {
  const { context, userSettings, preference, workspacePolicy } = input;
  const event = getEventType(context.eventKey);

  if (!event) {
    return { allow: false, skipReason: "unknown_event" };
  }

  const critical = Boolean(event.critical);
  const channelPolicy = findChannelPolicy(workspacePolicy, context.channel);

  // 1) Workspace policy
  if (channelPolicy?.disabled) {
    return { allow: false, skipReason: "workspace_channel_disabled" };
  }

  if (
    channelPolicy?.locked &&
    typeof channelPolicy.forcedEnabled === "boolean"
  ) {
    if (!channelPolicy.forcedEnabled) {
      return { allow: false, skipReason: "workspace_channel_forced_off" };
    }
    // Forced on: still apply filters / timing below (except critical quiet-hours bypass)
  } else if (workspacePolicy?.lockedEventKeys?.includes(context.eventKey)) {
    // Locked event with no forced channel value → treat as admin-required defaults
    if (!event.defaultChannels.includes(context.channel)) {
      return { allow: false, skipReason: "workspace_event_locked_off" };
    }
  }

  const forcedOn =
    channelPolicy?.locked === true && channelPolicy.forcedEnabled === true;

  // 2) User global channel toggle (critical + workspace force bypass)
  if (!critical && !forcedOn && !channelGloballyEnabled(context.channel, userSettings)) {
    return {
      allow: false,
      skipReason:
        context.channel === "in_app"
          ? "global_in_app_disabled"
          : "global_email_disabled",
    };
  }

  // 3) Event + channel toggle (default = event.defaultChannels)
  const eventChannelEnabled =
    preference?.enabled ?? event.defaultChannels.includes(context.channel);

  if (!critical && !forcedOn && !eventChannelEnabled) {
    return { allow: false, skipReason: "event_channel_disabled" };
  }

  // 4) Source / condition filters (apply even for critical — targeting, not mute)
  const filterSkip = filtersBlock(preference?.filters, context);
  if (filterSkip) {
    return { allow: false, skipReason: filterSkip };
  }

  // 4b) Entity mute (critical still delivers)
  if (context.muted && !critical) {
    return { allow: false, skipReason: "entity_muted" };
  }

  // 5) Timing
  if (input.throttleExceeded && !critical) {
    return { allow: false, skipReason: "throttled" };
  }

  const now = context.now ?? new Date();
  const inQuiet = isWithinQuietHours(
    userSettings?.quietHours,
    now,
    userSettings?.timezone,
  );
  if (inQuiet && !critical) {
    return { allow: false, skipReason: "quiet_hours" };
  }

  let deferDigest: PreferenceResolveResult["deferDigest"] = null;
  if (context.channel === "email" && userSettings?.emailMode) {
    if (userSettings.emailMode === "hourly" || userSettings.emailMode === "daily") {
      if (!critical) {
        deferDigest = userSettings.emailMode;
      }
    }
  }

  return {
    allow: true,
    criticalBypass: critical,
    deferDigest,
  };
}

export class PreferenceResolver {
  resolve(input: PreferenceResolverInput): PreferenceResolveResult {
    return resolvePreference(input);
  }
}
