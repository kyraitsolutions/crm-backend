import { z } from "zod";
import {
  WhatsAppWebhookMessageSchema,
  WhatsAppWebhookMetadataSchema,
} from "./webhook-common.type.js";

export const WhatsAppHistorySyncValueSchema = z
  .object({
    messaging_product: z.string().optional(),
    metadata: WhatsAppWebhookMetadataSchema.optional(),
    history: z.array(z.unknown()).optional(),
    messages: z.array(WhatsAppWebhookMessageSchema).optional(),
  })
  .passthrough();

export type TWhatsAppHistorySyncValue = z.infer<typeof WhatsAppHistorySyncValueSchema>;
