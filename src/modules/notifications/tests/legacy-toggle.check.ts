import { expandLegacyToggles } from "../utils/legacy-toggle.util.js";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const critical = new Set(["system.whatsapp_disconnected"]);

const items = expandLegacyToggles(
  {
    new_lead: true,
    direct_messages: false,
    chatbot: true,
    system_alerts: false,
    communication: false,
  },
  critical,
);

const byKey = (eventKey: string, channel: string) =>
  items.find((i) => i.eventKey === eventKey && i.channel === channel);

assert(byKey("lead.created", "in_app")?.enabled === true, "new_lead on");
assert(
  byKey("conversation.message_received", "in_app")?.enabled === false,
  "dms off",
);
assert(byKey("chatbot.handoff", "email")?.enabled === true, "chatbot on");
assert(
  byKey("system.whatsapp_disconnected", "email")?.enabled === true,
  "critical forced on even if system_alerts off",
);

console.log("legacy-toggle checks passed");
