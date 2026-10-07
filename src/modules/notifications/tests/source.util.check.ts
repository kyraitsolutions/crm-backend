import { normalizeNotificationSource } from "../utils/source.util.js";
import { eventKeyToLegacyType, sourceToLegacyChannel } from "../utils/legacy-type.util.js";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

assert(normalizeNotificationSource("Meta Ads") === "meta_ads", "meta ads");
assert(normalizeNotificationSource("facebook") === "meta_ads", "facebook");
assert(normalizeNotificationSource("Google Ads") === "google_ads", "google");
assert(normalizeNotificationSource("Website Form") === "website_form", "form");
assert(normalizeNotificationSource("whatsapp") === "whatsapp", "wa");
assert(normalizeNotificationSource("chatbot") === "chatbot", "bot");
assert(normalizeNotificationSource(null) === null, "null");

assert(eventKeyToLegacyType("lead.created") === "new_lead", "legacy lead");
assert(
  eventKeyToLegacyType("conversation.message_received") === "message",
  "legacy message",
);
assert(eventKeyToLegacyType("chatbot.handoff") === "chatbot", "legacy bot");
assert(
  eventKeyToLegacyType("whatsapp.template_status_changed") === "system_alert",
  "legacy wa",
);

assert(sourceToLegacyChannel("meta_ads") === "facebook", "channel meta");
assert(sourceToLegacyChannel("website_form") === "webform", "channel form");

console.log("notification source util checks passed");
