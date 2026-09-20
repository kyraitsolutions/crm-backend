import { z } from "zod";

export const WhatsAppTemplateWebhookValueSchema = z
  .object({
    event: z.string(),
    message_template_id: z.coerce.string(),
    message_template_name: z.string().optional(),
    message_template_language: z.string().optional(),
    message_template_category: z.string().optional(),
    reason: z.string().nullable().optional(),
  })
  .passthrough();

export type TWhatsAppTemplateWebhookValue = z.infer<
  typeof WhatsAppTemplateWebhookValueSchema
>;

/** @deprecated Use TWhatsAppTemplateWebhookValue */
export type TemplateWebhookPayload = TWhatsAppTemplateWebhookValue;
