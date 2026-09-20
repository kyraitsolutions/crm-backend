import { z } from "zod";

export const WhatsAppWebhookFieldSchema = z.enum([
  "messages",
  "account_update",
  "smb_message_echoes",
  "smb_app_state_sync",
  "history",
  "message_template_status_update",
  "message_template_quality_update",
]);

export const WhatsAppWebhookMetadataSchema = z
  .object({
    display_phone_number: z.string().optional(),
    phone_number_id: z.string().optional(),
  })
  .passthrough();

export const WhatsAppWebhookContactSchema = z
  .object({
    wa_id: z.string(),
    profile: z
      .object({
        name: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const WhatsAppWebhookErrorSchema = z
  .object({
    code: z.number().optional(),
    title: z.string().optional(),
    message: z.string().optional(),
    href: z.string().optional(),
    error_data: z
      .object({
        details: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const WhatsAppMediaObjectSchema = z
  .object({
    id: z.string().optional(),
    link: z.string().optional(),
    mime_type: z.string().optional(),
    sha256: z.string().optional(),
    caption: z.string().optional(),
    filename: z.string().optional(),
    voice: z.boolean().optional(),
  })
  .passthrough();

export const WhatsAppInteractiveReplySchema = z
  .object({
    type: z.string().optional(),
    button_reply: z
      .object({
        id: z.coerce.string().optional(),
        title: z.string().optional(),
      })
      .passthrough()
      .optional(),
    list_reply: z
      .object({
        id: z.coerce.string().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
      })
      .passthrough()
      .optional(),
    nfm_reply: z
      .object({
        response_json: z.string().optional(),
        name: z.string().optional(),
        body: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const WhatsAppWebhookMessageContextSchema = z
  .object({
    from: z.string().optional(),
    id: z.string().optional(),
    forwarded: z.boolean().optional(),
    frequently_forwarded: z.boolean().optional(),
  })
  .passthrough();

export const WhatsAppWebhookMessageSchema = z
  .object({
    from: z.string().optional(),
    to: z.string().optional(),
    id: z.string(),
    timestamp: z.string().optional(),
    type: z.string(),
    text: z
      .object({
        body: z.string().optional(),
      })
      .passthrough()
      .optional(),
    image: WhatsAppMediaObjectSchema.optional(),
    video: WhatsAppMediaObjectSchema.optional(),
    audio: WhatsAppMediaObjectSchema.optional(),
    document: WhatsAppMediaObjectSchema.optional(),
    sticker: WhatsAppMediaObjectSchema.optional(),
    location: z
      .object({
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        name: z.string().optional(),
        address: z.string().optional(),
      })
      .passthrough()
      .optional(),
    interactive: WhatsAppInteractiveReplySchema.optional(),
    button: z
      .object({
        payload: z.string().optional(),
        text: z.string().optional(),
      })
      .passthrough()
      .optional(),
    reaction: z
      .object({
        message_id: z.string().optional(),
        emoji: z.string().optional(),
      })
      .passthrough()
      .optional(),
    context: WhatsAppWebhookMessageContextSchema.optional(),
    errors: z.array(WhatsAppWebhookErrorSchema).optional(),
    revoke: z
      .object({
        original_message_id: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export type TWhatsAppWebhookField = z.infer<typeof WhatsAppWebhookFieldSchema>;
export type TWhatsAppWebhookMetadata = z.infer<typeof WhatsAppWebhookMetadataSchema>;
export type TWhatsAppWebhookContact = z.infer<typeof WhatsAppWebhookContactSchema>;
export type TWhatsAppWebhookError = z.infer<typeof WhatsAppWebhookErrorSchema>;
export type TWhatsAppMediaObject = z.infer<typeof WhatsAppMediaObjectSchema>;
export type TWhatsAppInteractiveReply = z.infer<typeof WhatsAppInteractiveReplySchema>;
export type TWhatsAppWebhookMessage = z.infer<typeof WhatsAppWebhookMessageSchema>;
