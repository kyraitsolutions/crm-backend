/**
 * Maps the old static Settings toggles → new event keys.
 */
export const LEGACY_TOGGLE_EVENT_MAP = {
  new_lead: ["lead.created", "lead.assigned"],
  direct_messages: ["conversation.message_received"],
  chatbot: ["chatbot.handoff"],
  system_alerts: [
    "system.integration_error",
    "system.whatsapp_disconnected",
    "system.gmail_token_expired",
    "whatsapp.template_status_changed",
    "whatsapp.quality_changed",
  ],
  communication: [
    "email.reply_received",
    "email.bounced",
    "email.campaign_completed",
    "conversation.intervention_requested",
    "conversation.mentioned",
  ],
} as const;

export type LegacyToggleKey = keyof typeof LEGACY_TOGGLE_EVENT_MAP;

export type LegacyToggleState = Partial<Record<LegacyToggleKey, boolean>>;

/**
 * Expand legacy on/off buckets into per-event+channel preference upserts.
 * Critical events always stay enabled.
 */
export function expandLegacyToggles(
  toggles: LegacyToggleState,
  criticalKeys: Set<string>,
): Array<{
  eventKey: string;
  channel: "in_app" | "email";
  enabled: boolean;
  filters: Record<string, never>;
}> {
  const enabledByEvent = new Map<string, boolean>();

  for (const [bucket, eventKeys] of Object.entries(LEGACY_TOGGLE_EVENT_MAP)) {
    const on = Boolean(toggles[bucket as LegacyToggleKey]);
    for (const eventKey of eventKeys) {
      // If multiple buckets mention a key, OR the enabled flags.
      const prev = enabledByEvent.get(eventKey);
      enabledByEvent.set(eventKey, prev === undefined ? on : prev || on);
    }
  }

  const items: Array<{
    eventKey: string;
    channel: "in_app" | "email";
    enabled: boolean;
    filters: Record<string, never>;
  }> = [];

  for (const [eventKey, enabled] of enabledByEvent) {
    const forceOn = criticalKeys.has(eventKey);
    for (const channel of ["in_app", "email"] as const) {
      items.push({
        eventKey,
        channel,
        enabled: forceOn ? true : enabled,
        filters: {},
      });
    }
  }

  return items;
}
