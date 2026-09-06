export const WHATSAPP_CAMPAIGN_STATUS = {
  DRAFT: "DRAFT",
  SCHEDULED: "SCHEDULED",
  QUEUED: "QUEUED",
  SENDING: "SENDING",
  COMPLETED: "COMPLETED",
  PAUSED: "PAUSED",
  CANCELED: "CANCELED",
  FAILED: "FAILED",
} as const;

export const WHATSAPP_RECIPIENT_STATUS = {
  PENDING: "PENDING",
  QUEUED: "QUEUED",
  SENT: "SENT",
  DELIVERED: "DELIVERED",
  READ: "READ",
  FAILED: "FAILED",
  SKIPPED: "SKIPPED",
  OPTED_OUT: "OPTED_OUT",
} as const;

export const WHATSAPP_CAMPAIGN_BATCH_SIZE = Number(
  process.env.WHATSAPP_CAMPAIGN_BATCH_SIZE || 25,
);
export const WHATSAPP_SEND_GAP_MS = Number(process.env.WHATSAPP_SEND_GAP_MS || 250);

export const ALLOWED_WHATSAPP_CAMPAIGN_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["SCHEDULED", "QUEUED", "CANCELED"],
  SCHEDULED: ["QUEUED", "CANCELED", "DRAFT"],
  QUEUED: ["SENDING", "PAUSED", "CANCELED", "FAILED"],
  SENDING: ["COMPLETED", "PAUSED", "FAILED", "CANCELED"],
  PAUSED: ["QUEUED", "CANCELED"],
};

export const MESSAGING_TIER_LIMIT: Record<string, number> = {
  TIER_50: 50,
  TIER_250: 250,
  TIER_1K: 1000,
  TIER_10K: 10000,
  TIER_100K: 100000,
  TIER_UNLIMITED: Number.MAX_SAFE_INTEGER,
};

export const DEFAULT_OPT_OUT_KEYWORDS = ["stop", "unsubscribe", "opt out", "opt-out", "don't send", "dont send"];
export const DEFAULT_OPT_IN_KEYWORDS = ["start", "subscribe", "opt in", "opt-in", "allow"];
export const DEFAULT_OPT_OUT_MESSAGE =
  "You have been opted-out of your future communications.";
export const DEFAULT_OPT_IN_MESSAGE =
  "Thanks, You have been opted-in of your future communications.";
