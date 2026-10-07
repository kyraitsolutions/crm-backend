export const NOTIFICATION_CHANNELS = ["in_app", "email"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_MODULES = [
  "leads",
  "conversations",
  "email",
  "campaigns",
  "team",
  "system",
] as const;
export type NotificationModule = (typeof NOTIFICATION_MODULES)[number];

export const NOTIFICATION_SOURCES = [
  "meta_ads",
  "google_ads",
  "website_form",
  "chatbot",
  "whatsapp",
  "instagram",
  "manual",
  "import",
  "api",
] as const;
export type NotificationSource = (typeof NOTIFICATION_SOURCES)[number];

export const RECIPIENT_STRATEGIES = [
  "assignee",
  "owner",
  "team",
  "admins",
  "account",
] as const;
export type RecipientStrategy = (typeof RECIPIENT_STRATEGIES)[number];

export const EMAIL_DIGEST_MODES = ["instant", "hourly", "daily"] as const;
export type EmailDigestMode = (typeof EMAIL_DIGEST_MODES)[number];

export type SupportedFilter =
  | "sources"
  | "assigned_to_me"
  | "unassigned_only"
  | "min_lead_score";

export type NotificationEventTypeDef = {
  key: string;
  module: NotificationModule;
  label: string;
  description: string;
  defaultChannels: NotificationChannel[];
  critical: boolean;
  supportedSources: NotificationSource[];
  supportedFilters: SupportedFilter[];
  recipientStrategy: RecipientStrategy;
  groupable: boolean;
  /** Maps legacy UI toggle buckets for migration. */
  legacyBucket?:
    | "new_lead"
    | "direct_messages"
    | "chatbot"
    | "system_alerts"
    | "communication";
};

export type PreferenceFilters = {
  sources?: NotificationSource[];
  assigned_to_me?: boolean;
  unassigned_only?: boolean;
  min_lead_score?: number;
};

export type QuietHours = {
  enabled: boolean;
  start: string; // HH:mm
  end: string; // HH:mm
  timezone: string;
};

export type UserNotificationSettings = {
  organizationId: string;
  userId: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  emailMode: EmailDigestMode;
  quietHours: QuietHours;
  timezone: string;
};

export type EventChannelPreference = {
  organizationId: string;
  userId: string;
  eventKey: string;
  channel: NotificationChannel;
  enabled: boolean;
  filters: PreferenceFilters;
};

export type WorkspaceChannelPolicy = {
  channel: NotificationChannel;
  locked: boolean;
  forcedEnabled?: boolean | null;
  disabled: boolean;
};

export type WorkspaceNotificationPolicy = {
  organizationId: string;
  channels: WorkspaceChannelPolicy[];
  lockedEventKeys: string[];
};

export type ResolveContext = {
  eventKey: string;
  channel: NotificationChannel;
  source?: string | null;
  assigneeId?: string | null;
  recipientUserId: string;
  leadScore?: number | null;
  /** Entity mute for this recipient (conversation/lead/etc.). */
  muted?: boolean;
  now?: Date;
};

export type ResolveDecision = {
  allow: boolean;
  skipReason?: string;
  criticalBypass?: boolean;
};
