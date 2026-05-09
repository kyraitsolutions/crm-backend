import { z } from "zod";

// 🔹 Enums
export const ZNotificationType = z.enum([
  "new_lead",
  "message",
  "chatbot",
  "system_alert",
  "communication",
]);

export const ZChannelType = z.enum([
  "chatbot",
  "website",
  "google_ads",
  "whatsapp",
  "facebook",
  "instagram",
  "webform",
  "manual",
  "webhook",
]);

// 🔹 Full Notification (DB shape)
export const ZNotificationSchema = z.object({
  id: z.string(),

  organizationId: z.string(),
  accountId: z.string(),

  title: z.string(),
  description: z.string(),

  type: ZNotificationType,
  channelType: ZChannelType,

  isRead: z.boolean(),
  readAt: z.string().nullable().optional(),

  meta: z.record(z.any()).optional(),

  createdAt: z.string(),
  updatedAt: z.string(),
});


export const ZCreateNotificationSchema = z.object({
  organizationId: z.string(),
  accountId: z.string(),

  title: z.string().min(1),
  description: z.string().min(1),

  type: ZNotificationType,
  channelType: ZChannelType,

  meta: z.record(z.any()).optional(),
});

export type TNotification = z.infer<typeof ZNotificationSchema>;
export type TCreateNotification = z.infer<typeof ZCreateNotificationSchema>;