import { z } from "zod";
import { WhatsAppMessageStatusSchema } from "./message-status.type.js";
import {
  WhatsAppInteractiveReplySchema,
  WhatsAppWebhookContactSchema,
  WhatsAppWebhookErrorSchema,
  WhatsAppWebhookMessageSchema,
  WhatsAppWebhookMetadataSchema,
} from "./webhook-common.type.js";

export const WhatsAppInboundMessageSchema = WhatsAppWebhookMessageSchema.extend({
  from: z.string(),
});

export const WhatsAppMessagesValueSchema = z
  .object({
    messaging_product: z.string().optional(),
    metadata: WhatsAppWebhookMetadataSchema.optional(),
    contacts: z.array(WhatsAppWebhookContactSchema).optional(),
    messages: z.array(WhatsAppInboundMessageSchema).optional(),
    statuses: z.array(WhatsAppMessageStatusSchema).optional(),
    errors: z.array(WhatsAppWebhookErrorSchema).optional(),
  })
  .passthrough();

export const LiveChatAutoResolveResultSchema = z.object({
  action: z.literal("auto_resolve"),
  mode: z.string().nullable().optional(),
  isNewAttach: z.boolean().optional(),
  chatFlowId: z.string().nullable().optional(),
  aiAgentId: z.string().nullable().optional(),
});

export const LiveChatInboundResultSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("welcome") }),
  z.object({ action: z.literal("off_hours") }),
  LiveChatAutoResolveResultSchema,
]);

export const ParsedWhatsAppMessageSchema = z
  .object({
    messageId: z.string(),
    from: z.enum(["user", "agent"]),
    direction: z.enum(["inbound", "outbound"]),
    platform: z.literal("whatsapp"),
    status: z.string(),
    searchText: z.string().optional(),
    type: z.string(),
    body: z
      .object({
        text: z.string().optional(),
      })
      .optional(),
    media: z.unknown().optional(),
    interactive: WhatsAppInteractiveReplySchema.optional(),
  })

export const IncomingMessageContextSchema = z.object({
  accountId: z.string(),
  organizationId: z.string(),
  conversationId: z.string(),
  phone: z.string(),
  contactName: z.string(),
  isNewConversation: z.boolean(),
  parsedMessage: ParsedWhatsAppMessageSchema,
});

export type TWhatsAppInboundMessage = z.infer<typeof WhatsAppInboundMessageSchema>;
export type TWhatsAppMessagesValue = z.infer<typeof WhatsAppMessagesValueSchema>;
export type TLiveChatAutoResolveResult = z.infer<typeof LiveChatAutoResolveResultSchema>;
export type TLiveChatInboundResult = z.infer<typeof LiveChatInboundResultSchema>;
export type TParsedWhatsAppMessage = z.infer<typeof ParsedWhatsAppMessageSchema>;
export type TIncomingMessageContext = z.infer<typeof IncomingMessageContextSchema>;
