import { getEventType } from "../registry/event-types.registry.js";
import {
  isWithinQuietHours,
  parseTimeToMinutes,
  resolvePreference,
  type PreferenceResolverInput,
} from "../services/preference-resolver.service.js";
import type {
  UserNotificationSettings,
  WorkspaceNotificationPolicy,
} from "../types/notification-config.types.js";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const baseSettings = (
  overrides: Partial<UserNotificationSettings> = {},
): UserNotificationSettings => ({
  organizationId: "org1",
  userId: "user1",
  inAppEnabled: true,
  emailEnabled: true,
  emailMode: "instant",
  quietHours: {
    enabled: false,
    start: "22:00",
    end: "08:00",
    timezone: "UTC",
  },
  timezone: "UTC",
  ...overrides,
});

const baseInput = (
  overrides: Partial<PreferenceResolverInput> = {},
): PreferenceResolverInput => ({
  context: {
    eventKey: "lead.created",
    channel: "in_app",
    recipientUserId: "user1",
    source: "meta_ads",
    assigneeId: "user1",
    leadScore: 80,
    now: new Date("2026-06-01T12:00:00.000Z"),
  },
  userSettings: baseSettings(),
  preference: null,
  workspacePolicy: null,
  ...overrides,
});

// --- helpers ---
assert(parseTimeToMinutes("22:00") === 22 * 60, "parse 22:00");
assert(parseTimeToMinutes("08:30") === 8 * 60 + 30, "parse 08:30");
assert(parseTimeToMinutes("bad") === null, "parse invalid");

assert(
  isWithinQuietHours(
    { enabled: true, start: "22:00", end: "08:00", timezone: "UTC" },
    new Date("2026-06-01T23:00:00.000Z"),
  ) === true,
  "overnight quiet: 23:00 in",
);
assert(
  isWithinQuietHours(
    { enabled: true, start: "22:00", end: "08:00", timezone: "UTC" },
    new Date("2026-06-01T12:00:00.000Z"),
  ) === false,
  "overnight quiet: noon out",
);
assert(
  isWithinQuietHours(
    { enabled: true, start: "09:00", end: "17:00", timezone: "UTC" },
    new Date("2026-06-01T10:00:00.000Z"),
  ) === true,
  "same-day quiet: 10:00 in",
);

// --- global off blocks everything ---
{
  const result = resolvePreference(
    baseInput({
      userSettings: baseSettings({ inAppEnabled: false }),
    }),
  );
  assert(result.allow === false, "global in_app off blocks");
  assert(result.skipReason === "global_in_app_disabled", "global skip reason");
}

{
  const result = resolvePreference(
    baseInput({
      context: {
        ...baseInput().context,
        channel: "email",
      },
      userSettings: baseSettings({ emailEnabled: false }),
    }),
  );
  assert(result.allow === false, "global email off blocks");
  assert(result.skipReason === "global_email_disabled", "email skip reason");
}

// --- critical bypass (user disable + quiet hours) ---
{
  const result = resolvePreference(
    baseInput({
      context: {
        eventKey: "system.whatsapp_disconnected",
        channel: "in_app",
        recipientUserId: "user1",
        now: new Date("2026-06-01T23:30:00.000Z"),
      },
      userSettings: baseSettings({
        inAppEnabled: false,
        quietHours: {
          enabled: true,
          start: "22:00",
          end: "08:00",
          timezone: "UTC",
        },
      }),
      preference: { enabled: false, filters: {} },
    }),
  );
  assert(result.allow === true, "critical bypasses user disable + quiet hours");
  assert(result.criticalBypass === true, "criticalBypass flag");
}

// --- source filter ---
{
  const result = resolvePreference(
    baseInput({
      preference: {
        enabled: true,
        filters: { sources: ["meta_ads", "google_ads"] },
      },
      context: {
        ...baseInput().context,
        source: "website_form",
      },
    }),
  );
  assert(result.allow === false, "source filter blocks");
  assert(result.skipReason === "source_filtered", "source skip reason");
}

{
  const result = resolvePreference(
    baseInput({
      preference: {
        enabled: true,
        filters: { sources: ["meta_ads", "google_ads"] },
      },
      context: {
        ...baseInput().context,
        source: "meta_ads",
      },
    }),
  );
  assert(result.allow === true, "source filter allows match");
}

// --- assigned_to_me ---
{
  const result = resolvePreference(
    baseInput({
      preference: {
        enabled: true,
        filters: { assigned_to_me: true },
      },
      context: {
        ...baseInput().context,
        assigneeId: "other-user",
        recipientUserId: "user1",
      },
    }),
  );
  assert(result.allow === false, "assigned_to_me blocks other assignee");
  assert(result.skipReason === "assigned_to_me_mismatch", "assigned skip");
}

{
  const result = resolvePreference(
    baseInput({
      preference: {
        enabled: true,
        filters: { assigned_to_me: true },
      },
      context: {
        ...baseInput().context,
        assigneeId: "user1",
        recipientUserId: "user1",
      },
    }),
  );
  assert(result.allow === true, "assigned_to_me allows self");
}

// --- unassigned_only ---
{
  const blocked = resolvePreference(
    baseInput({
      preference: {
        enabled: true,
        filters: { unassigned_only: true },
      },
      context: {
        ...baseInput().context,
        assigneeId: "user1",
      },
    }),
  );
  assert(blocked.allow === false, "unassigned_only blocks assigned");

  const allowed = resolvePreference(
    baseInput({
      preference: {
        enabled: true,
        filters: { unassigned_only: true },
      },
      context: {
        ...baseInput().context,
        assigneeId: null,
      },
    }),
  );
  assert(allowed.allow === true, "unassigned_only allows null assignee");
}

// --- quiet hours (non-critical) ---
{
  const result = resolvePreference(
    baseInput({
      context: {
        ...baseInput().context,
        now: new Date("2026-06-01T23:00:00.000Z"),
      },
      userSettings: baseSettings({
        quietHours: {
          enabled: true,
          start: "22:00",
          end: "08:00",
          timezone: "UTC",
        },
      }),
    }),
  );
  assert(result.allow === false, "quiet hours block non-critical");
  assert(result.skipReason === "quiet_hours", "quiet hours reason");
}

// --- workspace policy lock / disable ---
{
  const policy: WorkspaceNotificationPolicy = {
    organizationId: "org1",
    channels: [
      {
        channel: "in_app",
        locked: false,
        forcedEnabled: null,
        disabled: true,
      },
    ],
    lockedEventKeys: [],
  };
  const result = resolvePreference(baseInput({ workspacePolicy: policy }));
  assert(result.allow === false, "workspace disabled channel blocks");
  assert(
    result.skipReason === "workspace_channel_disabled",
    "workspace disable reason",
  );
}

{
  const policy: WorkspaceNotificationPolicy = {
    organizationId: "org1",
    channels: [
      {
        channel: "email",
        locked: true,
        forcedEnabled: true,
        disabled: false,
      },
    ],
    lockedEventKeys: [],
  };
  const result = resolvePreference(
    baseInput({
      context: {
        ...baseInput().context,
        channel: "email",
      },
      userSettings: baseSettings({ emailEnabled: false }),
      preference: { enabled: false, filters: {} },
      workspacePolicy: policy,
    }),
  );
  assert(result.allow === true, "workspace forcedEnabled bypasses user off");
}

// --- event channel disabled ---
{
  const result = resolvePreference(
    baseInput({
      preference: { enabled: false, filters: {} },
    }),
  );
  assert(result.allow === false, "event channel off");
  assert(result.skipReason === "event_channel_disabled", "event off reason");
}

// --- min lead score ---
{
  const result = resolvePreference(
    baseInput({
      preference: {
        enabled: true,
        filters: { min_lead_score: 90 },
      },
      context: {
        ...baseInput().context,
        leadScore: 50,
      },
    }),
  );
  assert(result.allow === false, "min score blocks");
  assert(result.skipReason === "min_lead_score", "min score reason");
}

// --- email digest deferral ---
{
  const result = resolvePreference(
    baseInput({
      context: {
        ...baseInput().context,
        channel: "email",
      },
      userSettings: baseSettings({ emailMode: "hourly" }),
    }),
  );
  assert(result.allow === true, "digest still allows");
  assert(result.deferDigest === "hourly", "defer hourly digest");
}

// --- grouping flag presence on registry (groupable events) ---
{
  const msg = getEventType("conversation.message_received");
  assert(msg?.groupable === true, "message event is groupable");
  const lead = getEventType("lead.created");
  assert(lead?.groupable === false, "lead.created not groupable");
}

// --- unknown event ---
{
  const result = resolvePreference(
    baseInput({
      context: {
        ...baseInput().context,
        eventKey: "not.a.real.event",
      },
    }),
  );
  assert(result.allow === false && result.skipReason === "unknown_event", "unknown");
}

// --- throttle ---
{
  const result = resolvePreference(
    baseInput({ throttleExceeded: true }),
  );
  assert(result.allow === false && result.skipReason === "throttled", "throttle");
}

// --- entity mute ---
{
  const blocked = resolvePreference(
    baseInput({
      context: {
        ...baseInput().context,
        muted: true,
      },
    }),
  );
  assert(blocked.allow === false && blocked.skipReason === "entity_muted", "mute blocks");

  const critical = resolvePreference(
    baseInput({
      context: {
        eventKey: "system.whatsapp_disconnected",
        channel: "in_app",
        recipientUserId: "user1",
        muted: true,
        now: new Date("2026-06-01T12:00:00.000Z"),
      },
    }),
  );
  assert(critical.allow === true, "critical bypasses mute");
}

console.log("preference-resolver checks passed");
