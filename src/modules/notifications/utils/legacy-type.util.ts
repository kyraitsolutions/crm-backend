import type { NotificationEventTypeDef } from "../types/notification-config.types.js";

export type LegacyInboxType =
  | "new_lead"
  | "message"
  | "chatbot"
  | "system_alert"
  | "communication";

export type LegacyChannelType =
  | "chatbot"
  | "website"
  | "google_ads"
  | "whatsapp"
  | "facebook"
  | "instagram"
  | "webform"
  | "manual"
  | "webhook";

export function eventKeyToLegacyType(eventKey: string): LegacyInboxType {
  if (eventKey.startsWith("lead.")) return "new_lead";
  if (eventKey === "chatbot.handoff") return "chatbot";
  if (
    eventKey === "conversation.message_received" ||
    eventKey === "conversation.unanswered_sla"
  ) {
    return "message";
  }
  if (
    eventKey === "conversation.intervention_requested" ||
    eventKey === "conversation.mentioned" ||
    eventKey.startsWith("email.")
  ) {
    return "communication";
  }
  return "system_alert";
}

export function sourceToLegacyChannel(
  source?: string | null,
): LegacyChannelType {
  const value = String(source || "manual").toLowerCase();
  if (value === "meta_ads" || value.includes("facebook")) return "facebook";
  if (value === "google_ads" || value.includes("google")) return "google_ads";
  if (value === "website_form" || value.includes("form") || value === "website")
    return "webform";
  if (value === "chatbot" || value.includes("chat")) return "chatbot";
  if (value === "whatsapp" || value.includes("whatsapp")) return "whatsapp";
  if (value === "instagram" || value.includes("instagram")) return "instagram";
  if (value.includes("hook")) return "webhook";
  if (value === "manual" || value === "import" || value === "api") return "manual";
  return "manual";
}

export function legacyBucketHint(
  event: NotificationEventTypeDef | null,
): LegacyInboxType | null {
  if (!event?.legacyBucket) return null;
  if (event.legacyBucket === "new_lead") return "new_lead";
  if (event.legacyBucket === "direct_messages") return "message";
  if (event.legacyBucket === "chatbot") return "chatbot";
  if (event.legacyBucket === "system_alerts") return "system_alert";
  if (event.legacyBucket === "communication") return "communication";
  return null;
}
