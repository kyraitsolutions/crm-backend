import { z } from "zod";
import { WhatsAppAccountUpdateValueSchema } from "./account-update.type.js";
import { WhatsAppContactSyncValueSchema } from "./contact-sync.type.js";
import { WhatsAppHistorySyncValueSchema } from "./history-sync.type.js";
import { WhatsAppMessagesValueSchema } from "./incoming-message.type.js";
import { WhatsAppMessageEchoesValueSchema } from "./message-echo.type.js";
import { WhatsAppTemplateWebhookValueSchema } from "./template-webhook.type.js";

export const WhatsAppWebhookChangeSchema = z.discriminatedUnion("field", [
  z.object({
    field: z.literal("messages"),
    value: WhatsAppMessagesValueSchema,
  }),
  z.object({
    field: z.literal("account_update"),
    value: WhatsAppAccountUpdateValueSchema,
  }),
  z.object({
    field: z.literal("smb_message_echoes"),
    value: WhatsAppMessageEchoesValueSchema,
  }),
  z.object({
    field: z.literal("smb_app_state_sync"),
    value: WhatsAppContactSyncValueSchema,
  }),
  z.object({
    field: z.literal("history"),
    value: WhatsAppHistorySyncValueSchema,
  }),
  z.object({
    field: z.literal("message_template_status_update"),
    value: WhatsAppTemplateWebhookValueSchema,
  }),
  z.object({
    field: z.literal("message_template_quality_update"),
    value: WhatsAppTemplateWebhookValueSchema,
  }),
]);

export const WhatsAppWebhookUnknownChangeSchema = z
  .object({
    field: z.string(),
    value: z.unknown().optional(),
  })
  .passthrough();

export const WhatsAppWebhookEntrySchema = z
  .object({
    id: z.string().optional(),
    changes: z.array(WhatsAppWebhookUnknownChangeSchema).optional(),
  })
  .passthrough();

export const WhatsAppWebhookEnvelopeSchema = z
  .object({
    object: z.string().optional(),
    entry: z.array(WhatsAppWebhookEntrySchema).optional(),
  })
  .passthrough();

export type TWhatsAppWebhookChange = z.infer<typeof WhatsAppWebhookChangeSchema>;
export type TWhatsAppWebhookUnknownChange = z.infer<
  typeof WhatsAppWebhookUnknownChangeSchema
>;
export type TWhatsAppWebhookEntry = z.infer<typeof WhatsAppWebhookEntrySchema>;
export type TWhatsAppWebhookEnvelope = z.infer<typeof WhatsAppWebhookEnvelopeSchema>;
