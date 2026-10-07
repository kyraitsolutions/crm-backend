import { notificationSlaService } from "../modules/notifications/services/notification-sla.service.js";
import logger from "../utils/logger.js";

const INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes

export function startNotificationSlaWorker() {
  const tick = async () => {
    try {
      const result = await notificationSlaService.sweepUnanswered();
      if (result.dispatched > 0) {
        logger.info("Notification SLA worker tick", result);
      }
    } catch (error) {
      logger.error("Notification SLA worker failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  void tick();
  setInterval(tick, INTERVAL_MS);
}
