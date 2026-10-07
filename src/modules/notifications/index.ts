export * from "./types/notification-config.types.js";
export {
  NOTIFICATION_EVENT_TYPES,
  NOTIFICATION_EVENT_TYPE_MAP,
  getEventType,
  getEventTypesByModule,
} from "./registry/event-types.registry.js";

export { NotificationEventTypeModel } from "./models/notification-event-type.model.js";
export { NotificationUserSettingsModel } from "./models/notification-user-settings.model.js";
export { NotificationPreferenceModel } from "./models/notification-preference.model.js";
export { NotificationWorkspacePolicyModel } from "./models/notification-workspace-policy.model.js";
export { NotificationDeliveryModel } from "./models/notification-delivery.model.js";
export { NotificationMuteModel } from "./models/notification-mute.model.js";

export {
  PreferenceResolver,
  resolvePreference,
  isWithinQuietHours,
  parseTimeToMinutes,
} from "./services/preference-resolver.service.js";
export type {
  PreferenceResolverInput,
  PreferenceResolveResult,
} from "./services/preference-resolver.service.js";

export { syncNotificationEventTypes } from "./services/sync-event-types.service.js";
export {
  NotificationDispatchService,
  notificationDispatchService,
} from "./services/notification-dispatch.service.js";
export type { NotificationDispatchInput } from "./services/notification-dispatch.service.js";
export { resolveRecipients } from "./services/recipient-resolver.service.js";
export { normalizeNotificationSource } from "./utils/source.util.js";
export {
  NotificationSettingsService,
  notificationSettingsService,
} from "./services/notification-settings.service.js";
export {
  NotificationEmailService,
  notificationEmailService,
} from "./services/notification-email.service.js";
export {
  NotificationMuteService,
  notificationMuteService,
} from "./services/notification-mute.service.js";
export {
  NotificationSlaService,
  notificationSlaService,
} from "./services/notification-sla.service.js";
export {
  LEGACY_TOGGLE_EVENT_MAP,
  expandLegacyToggles,
} from "./utils/legacy-toggle.util.js";
export { StaffAlertConfigModel } from "./models/staff-alert-config.model.js";
export {
  StaffAlertService,
  staffAlertService,
} from "./services/staff-alert.service.js";
