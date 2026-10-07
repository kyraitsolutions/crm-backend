import assert from "node:assert/strict";
import {
  delayMilliseconds,
  evaluateRules,
  fillTemplate,
  interpolateMessage,
  matchesKeyword,
  mayKeywordStartOnExisting,
  questionAttributeKey,
  resolveTemplateVariables,
  safeRequestUrl,
  syncResolvedVariables,
  validateQuestionReply,
} from "./chatflow-logic.util.js";

const variables = { reply: "Yes please", name: "Kyra", phone: "9198" };

assert.equal(fillTemplate("Hi {{name}}", variables), "Hi Kyra");
assert.equal(fillTemplate("{{missing}}", variables), "");

assert.equal(
  evaluateRules(
    [{ left: "{{reply}}", operator: "contains", right: "yes" }],
    "all",
    variables,
  ),
  true,
);
assert.equal(
  evaluateRules(
    [{ left: "{{name}}", operator: "equals", right: "Other" }],
    "all",
    variables,
  ),
  false,
);
assert.equal(
  evaluateRules(
    [
      { left: "{{name}}", operator: "equals", right: "Kyra" },
      { left: "{{reply}}", operator: "empty" },
    ],
    "any",
    variables,
  ),
  true,
);
assert.equal(safeRequestUrl("http://example.com"), null);
assert.equal(safeRequestUrl("https://127.0.0.1/secret"), null);
assert.equal(
  safeRequestUrl("https://api.example.com/orders"),
  "https://api.example.com/orders",
);
assert.equal(
  evaluateRules([{ left: "{{name}}", operator: "gte", right: "" }], "all", variables),
  false,
);
assert.equal(
  evaluateRules([{ left: "10", operator: "gte", right: "10" }], "all", {}),
  true,
);
assert.equal(
  evaluateRules([{ left: "", operator: "gt", right: "1" }], "all", {}),
  false,
);
assert.equal(matchesKeyword({ words: "yes, ok" }, "Yes please"), true);
assert.equal(matchesKeyword({ words: "yes", match: "exact" }, "yes please"), false);
assert.equal(matchesKeyword({ words: "yes", match: "phrase" }, "yesterday"), false);
assert.equal(matchesKeyword({ words: "Yes", match: "exact", caseSensitive: true }, "yes"), false);
assert.equal(mayKeywordStartOnExisting("keyword", true), true);
assert.equal(mayKeywordStartOnExisting("keyword", false), false);
assert.equal(mayKeywordStartOnExisting("send_message", true), false);
assert.equal(mayKeywordStartOnExisting("send_message", false), false);
assert.equal(delayMilliseconds({ seconds: 5 }), 5000);
assert.equal(delayMilliseconds({ unit: "days", amount: 2 }), 2 * 86_400_000);
assert.equal(delayMilliseconds({ unit: "days", amount: 90 }), 30 * 86_400_000);
assert.equal(validateQuestionReply({ inputType: "email", text: "a@b.com" }).ok, true);
assert.equal(validateQuestionReply({ inputType: "email", text: "nope" }).ok, false);
assert.equal(
  validateQuestionReply({ inputType: "media", text: "hello", inboundType: "text" }).ok,
  false,
);
assert.equal(
  validateQuestionReply({ inputType: "media", inboundType: "image", text: "photo" }).ok,
  true,
);
assert.equal(validateQuestionReply({ inputType: "email", required: false, text: "nope" }).ok, true);
assert.equal(questionAttributeKey("address", ""), "address");
assert.equal(questionAttributeKey("text", "customer_name"), "customer_name");
assert.equal(questionAttributeKey("number", "monthly_lead_volume_reply"), "monthly_lead_volume_reply");

const resumedSession = {
  monthly_lead_volume_reply: "1500",
  phone: "919800000000",
  reply: "1500",
};
const resumed = resolveTemplateVariables({
  session: resumedSession,
  contact: {
    name: "Kyra",
    phone: "910000000000",
    attributes: { city: "Pune", monthly_lead_volume_reply: "should-not-win" },
  },
  conversation: { plan: "growth" },
});
const template = "Hi {{name}}, volume {{monthly_lead_volume_reply}}. Missing {{unknown_field}}.";
const rendered = interpolateMessage(template, resumed);
assert.equal(rendered.text, "Hi Kyra, volume 1500. Missing .");
assert.deepEqual(rendered.missing, ["unknown_field"]);
assert.equal(template, "Hi {{name}}, volume {{monthly_lead_volume_reply}}. Missing {{unknown_field}}.");
assert.equal(interpolateMessage("{{reply}}", resumed).text, "1500");
assert.equal(interpolateMessage("{{phone}}", resumed).text, "919800000000");
assert.equal(interpolateMessage("{{city}}", resumed).text, "Pune");
assert.equal(
  evaluateRules(
    [{ left: "{{monthly_lead_volume_reply}}", operator: "gt", right: "1000" }],
    "all",
    resumed,
  ),
  true,
);
assert.equal(
  evaluateRules(
    [{ left: "{{monthly_lead_volume_reply}}", operator: "lt", right: "1000" }],
    "all",
    resumed,
  ),
  false,
);

const named = resolveTemplateVariables({
  session: { name: "Saved", reply: "hello" },
  contact: { name: "Contact" },
});

assert.equal(interpolateMessage("{{name}} {{reply}}", named).text, "Saved hello");

const session: Record<string, string> = { monthly_lead_volume_reply: "1500" };
const lookedUp = resolveTemplateVariables({
  session,
  contact: { name: "Kyra" },
});
const before = { ...lookedUp };
lookedUp.monthly_lead_volume_reply = "1500";
lookedUp.api_status = "200";
syncResolvedVariables(session, before, lookedUp);
assert.equal(session.monthly_lead_volume_reply, "1500");
assert.equal(session.api_status, "200");
assert.equal(session.name, undefined);

console.log("chatflow logic checks passed");
