import {
  campaignRates,
  dedupeRecipients,
  isValidEmailFormat,
  normalizeEmail,
} from "../../utils/email-analytics.util.js";
import {
  createTrackingToken,
  verifyTrackingToken,
} from "../../utils/email-tracking-token.js";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

assert(normalizeEmail("  A@X.com ") === "a@x.com", "normalize email");
assert(isValidEmailFormat("lead@hotel.com"), "valid email");
assert(!isValidEmailFormat("not-an-email"), "invalid email");

const { unique, duplicates } = dedupeRecipients([
  { email: "a@x.com" },
  { email: "A@x.com" },
  { email: "b@x.com" },
]);
assert(unique.length === 2 && duplicates === 1, "dedupe recipients");

const rates = campaignRates({
  sentCount: 0,
  deliveredCount: 0,
  openedCount: 0,
  clickedCount: 0,
});
assert(rates.openRate === 0 && rates.clickRate === 0, "zero division rates");

const rates2 = campaignRates({
  sentCount: 100,
  deliveredCount: 80,
  openedCount: 40,
  clickedCount: 8,
  bouncedCount: 5,
  unsubscribedCount: 2,
});
assert(rates2.deliveryRate === 80, "delivery rate");
assert(rates2.openRate === 50, "open rate");
assert(rates2.clickRate === 10, "click rate");
assert(rates2.bounceRate === 5, "bounce rate");

const token = createTrackingToken({
  t: "open",
  c: "campaign1",
  r: "recipient1",
});
const parsed = verifyTrackingToken(token);
assert(parsed?.t === "open" && parsed.c === "campaign1", "token verify");
assert(verifyTrackingToken(token + "x") === null, "tampered token rejected");

console.log("email-marketing unit checks passed");
