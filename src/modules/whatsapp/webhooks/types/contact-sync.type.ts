import { z } from "zod";
import { WhatsAppWebhookMetadataSchema } from "./webhook-common.type.js";

export const WhatsAppContactSyncItemSchema = z
  .object({
    type: z.string().optional(),
    action: z.string().optional(),
    contact: z
      .object({
        full_name: z.string().optional(),
        first_name: z.string().optional(),
        phone_number: z.string().optional(),
        user_id: z.string().optional(),
      })
      .passthrough()
      .optional(),
    metadata: z
      .object({
        timestamp: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const WhatsAppContactSyncValueSchema = z
  .object({
    messaging_product: z.string().optional(),
    metadata: WhatsAppWebhookMetadataSchema.optional(),
    state_sync: z.array(WhatsAppContactSyncItemSchema).optional(),
  })
  .passthrough();

export type TWhatsAppContactSyncItem = z.infer<typeof WhatsAppContactSyncItemSchema>;
export type TWhatsAppContactSyncValue = z.infer<typeof WhatsAppContactSyncValueSchema>;
