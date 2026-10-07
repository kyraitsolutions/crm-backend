import {
  moduleLabelForEvent,
  resolveDeepLinkUrl,
} from "../services/notification-email.service.js";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

assert(moduleLabelForEvent("lead.created") === "Leads", "module label leads");
assert(
  moduleLabelForEvent("conversation.message_received") === "Conversations",
  "module label conversations",
);
assert(moduleLabelForEvent("unknown.event") === "Notification", "fallback");

const absolute = resolveDeepLinkUrl("https://app.kyra.test/x");
assert(absolute === "https://app.kyra.test/x", "absolute deep link");

// Relative links depend on FRONTEND_URL; just ensure path is preserved when env empty/set.
const relative = resolveDeepLinkUrl("/dashboard/settings/notifications");
assert(
  relative.includes("/dashboard/settings/notifications"),
  "relative deep link retained",
);

console.log("notification-email util checks passed");
