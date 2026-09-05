import { SubscriptionService } from "../services/subscription.service.js";
import logger from "../utils/logger.js";

const INTERVAL_MS = 60 * 60 * 1000;

export function startSubscriptionLifecycleWorker() {
  const subscriptionService = new SubscriptionService();

  const tick = async () => {
    try {
      const expired = await subscriptionService.expireTrials();
      await subscriptionService.emitTrialReminders();
      logger.info("Subscription lifecycle tick", expired);
    } catch (error) {
      logger.error("Subscription lifecycle worker failed", {
        error: (error as Error).message,
      });
    }
  };

  void tick();
  setInterval(tick, INTERVAL_MS);
}
