import { normalizeAgentReply } from "../../modules/ai-agent/runtime/utils/interactive-reply.util.js";

const assert = (name: string, condition: boolean, extra?: unknown) => {
  if (!condition) {
    console.error("FAIL", name, extra);
    process.exitCode = 1;
    return;
  }
  console.log("ok", name);
};

const buttons = normalizeAgentReply(
  JSON.stringify({
    messageType: "button",
    text: "Pick a room",
    header: "A".repeat(80),
    footer: "B".repeat(80),
    buttons: [
      { id: "same", title: "Deluxe room with a very long name" },
      { id: "same", title: "Pool villa" },
      { id: "same", title: "Pool villa" },
    ],
  }),
  "fallback",
);
assert("button type", buttons.interactive?.type === "button", buttons.interactive);
const shapedButtons = (buttons.interactive?.action as { buttons: { reply: { id: string; title: string } }[] })
  .buttons;
assert("button count drops duplicate title", shapedButtons.length === 2, shapedButtons);
assert("button title clipped", shapedButtons[0].reply.title.length <= 20);
assert("button ids unique", new Set(shapedButtons.map((item) => item.reply.id)).size === 2);
assert("header clipped", String((buttons.interactive?.header as { text: string }).text).length <= 60);
assert("footer clipped", String((buttons.interactive?.footer as { text: string }).text).length <= 60);

const tooMany = normalizeAgentReply(
  JSON.stringify({
    messageType: "button",
    text: "Choose",
    buttons: [
      { title: "One" },
      { title: "Two" },
      { title: "Three" },
      { title: "Four" },
    ],
  }),
  "fallback",
);
assert("more than 3 buttons becomes a list", tooMany.interactive?.type === "list", tooMany.interactive);

const badLink = normalizeAgentReply(
  JSON.stringify({
    messageType: "cta_url",
    text: "Open the site",
    link: { label: "Visit", url: "javascript:alert(1)" },
  }),
  "fallback",
);
assert("bad url falls back to text", badLink.interactive === null && badLink.text === "Open the site");

const goodLink = normalizeAgentReply(
  JSON.stringify({
    messageType: "cta_url",
    text: "Our website",
    link: { label: "Visit site now please", url: "https://lp.ivararesorts.com/" },
  }),
  "fallback",
);
assert("cta url kept", goodLink.interactive?.type === "cta_url");
assert(
  "cta label clipped",
  String((goodLink.interactive?.action as { parameters: { display_text: string } }).parameters.display_text)
    .length <= 20,
);

const plain = normalizeAgentReply("Just a normal sentence.", "fallback");
assert("plain text stays text", plain.interactive === null && plain.text.startsWith("Just"));

const emptyInteractive = normalizeAgentReply(
  JSON.stringify({ messageType: "list", text: "Nothing to pick", sections: [] }),
  "fallback",
);
assert("empty list falls back", emptyInteractive.interactive === null);

const lines = normalizeAgentReply(
  JSON.stringify({
    messageType: "text",
    text: "Here are the plans.\\nTap below.",
  }),
  "fallback",
);
assert("json newline is kept", lines.text === "Here are the plans.\nTap below.", lines.text);

const prices = normalizeAgentReply(
  JSON.stringify({
    messageType: "text",
    text: "We offer three plans: Free Forever at ₹0/month (1 account), Professional at ₹999/month (3 accounts), and Enterprise at ₹1,999/month (unlimited). Email marketing is extra.",
  }),
  "fallback",
);
assert("price lines are split", prices.text.split("\n").length >= 4, prices.text);

const listed = normalizeAgentReply(
  JSON.stringify({
    messageType: "list",
    text: "Here are the plans.\nTap View plans.",
    listButton: "View plans",
    sections: [
      {
        title: "Plans",
        rows: [
          { id: "free", title: "Free Forever", description: "₹0/month" },
          { id: "pro", title: "Professional", description: "₹999/month" },
        ],
      },
    ],
  }),
  "fallback",
);
assert("list type", listed.interactive?.type === "list", listed.interactive);
assert(
  "list body keeps newline",
  String((listed.interactive?.body as { text: string }).text).includes("\n"),
);

console.log(process.exitCode ? "failed" : "passed");
