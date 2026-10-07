import { NOTIFICATION_SOURCES } from "../types/notification-config.types.js";

const SOURCE_SET = new Set<string>(NOTIFICATION_SOURCES);

/**
 * Normalize free-text lead/platform sources into registry source keys.
 */
export function normalizeNotificationSource(
  raw?: string | null,
): string | null {
  if (raw == null) return null;
  const value = String(raw).toLowerCase().trim();
  if (!value) return null;
  if (SOURCE_SET.has(value)) return value;

  if (
    value.includes("meta") ||
    value.includes("facebook") ||
    value === "fb" ||
    value.includes("fb_ads")
  ) {
    return "meta_ads";
  }
  if (value.includes("google")) return "google_ads";
  if (
    value.includes("webform") ||
    value.includes("website") ||
    value.includes("form")
  ) {
    return "website_form";
  }
  if (value.includes("chatbot") || value.includes("chat bot")) return "chatbot";
  if (value.includes("whatsapp") || value === "wa") return "whatsapp";
  if (value.includes("instagram") || value === "ig") return "instagram";
  if (value.includes("import")) return "import";
  if (value === "api" || value.endsWith("_api")) return "api";
  if (value.includes("manual")) return "manual";

  return value;
}
