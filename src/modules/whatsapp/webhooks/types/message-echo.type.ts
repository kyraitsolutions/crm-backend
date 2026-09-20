import { z } from "zod";
import {
  WhatsAppWebhookMessageSchema,
  WhatsAppWebhookMetadataSchema,
} from "./webhook-common.type.js";

export const WhatsAppMessageEchoSchema = WhatsAppWebhookMessageSchema.extend({
  to: z.string().optional(),
});

export const WhatsAppMessageEchoesValueSchema = z
  .object({
    messaging_product: z.string().optional(),
    metadata: WhatsAppWebhookMetadataSchema.optional(),
    message_echoes: z.array(WhatsAppMessageEchoSchema).optional(),
  })
  .passthrough();

export type TWhatsAppMessageEcho = z.infer<typeof WhatsAppMessageEchoSchema>;
export type TWhatsAppMessageEchoesValue = z.infer<
  typeof WhatsAppMessageEchoesValueSchema
>;
