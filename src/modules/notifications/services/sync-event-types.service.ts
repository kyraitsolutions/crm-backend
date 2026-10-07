import logger from "../../../utils/logger.js";
import { NotificationEventTypeModel } from "../models/notification-event-type.model.js";
import { NOTIFICATION_EVENT_TYPES } from "../registry/event-types.registry.js";

/**
 * Upserts the in-code event registry into Mongo. Safe to run on every boot.
 */
export async function syncNotificationEventTypes(): Promise<number> {
  const keys = NOTIFICATION_EVENT_TYPES.map((e) => e.key);

  const ops = NOTIFICATION_EVENT_TYPES.map((event) => ({
    updateOne: {
      filter: { key: event.key },
      update: {
        $set: {
          module: event.module,
          label: event.label,
          description: event.description,
          defaultChannels: event.defaultChannels,
          critical: event.critical,
          supportedSources: event.supportedSources,
          supportedFilters: event.supportedFilters,
          recipientStrategy: event.recipientStrategy,
          groupable: event.groupable,
          legacyBucket: event.legacyBucket ?? null,
          active: true,
        },
      },
      upsert: true,
    },
  }));

  if (ops.length) {
    await NotificationEventTypeModel.bulkWrite(ops, { ordered: false });
  }

  // Soft-deactivate registry keys removed from code
  await NotificationEventTypeModel.updateMany(
    { key: { $nin: keys } },
    { $set: { active: false } },
  );

  logger.info("Notification event types synced", { count: keys.length });
  return keys.length;
}
