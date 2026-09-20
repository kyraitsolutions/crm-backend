import { z } from "zod";
import {
  WhatsAppWebhookErrorSchema,
  WhatsAppWebhookMetadataSchema,
} from "./webhook-common.type.js";

export const WhatsAppMessageStatusSchema = z
  .object({
    id: z.string(),
    status: z.string(),
    timestamp: z.string().optional(),
    recipient_id: z.string().optional(),
    conversation: z
      .object({
        id: z.string().optional(),
        origin: z
          .object({
            type: z.string().optional(),
          })
          .passthrough()
          .optional(),
        expiration_timestamp: z.string().optional(),
      })
      .passthrough()
      .optional(),
    pricing: z
      .object({
        billable: z.boolean().optional(),
        pricing_model: z.string().optional(),
        category: z.string().optional(),
      })
      .passthrough()
      .optional(),
    errors: z.array(WhatsAppWebhookErrorSchema).optional(),
  })
  .passthrough();

export const WhatsAppMessageStatusesValueSchema = z
  .object({
    messaging_product: z.string().optional(),
    metadata: WhatsAppWebhookMetadataSchema.optional(),
    statuses: z.array(WhatsAppMessageStatusSchema).optional(),
    errors: z.array(WhatsAppWebhookErrorSchema).optional(),
  })
  .passthrough();

export type TWhatsAppMessageStatus = z.infer<typeof WhatsAppMessageStatusSchema>;
export type TWhatsAppMessageStatusesValue = z.infer<
  typeof WhatsAppMessageStatusesValueSchema
>;
