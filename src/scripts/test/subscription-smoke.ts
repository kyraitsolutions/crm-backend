import { FEATURE, USAGE_METRIC, SUBSCRIPTION_STATUS } from "../../constants/subscription.constant.js";
import { daysRemaining, isPast, utcNow } from "../../utils/subscription-date.util.js";

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function run() {
  const now = utcNow();
  const end = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);
  assert(daysRemaining(end, now) === 8, "daysRemaining should be 8");
  assert(isPast(new Date(now.getTime() - 1000), now) === true, "isPast should detect expired trial");
  assert(FEATURE.WHATSAPP_AI_AGENT === "WHATSAPP_AI_AGENT", "feature constant");
  assert(USAGE_METRIC.AI_CONVERSATIONS === "aiConversations", "ai conversation metric");
  assert(USAGE_METRIC.WHATSAPP_MESSAGES === "whatsappMessages", "whatsapp message metric");
  assert(SUBSCRIPTION_STATUS.TRIALING === "trialing", "trial status");
  console.log("subscription capability smoke tests passed");
}

run();
