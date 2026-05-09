import { z } from "zod";

export const PlatformSchema = z.enum([
  "chatbot",
  "whatsapp",
  "instagram",
  "messenger",
  "telegram",
  "email",
]);

export const IdentifiersSchema = z
  .object({
    chatbotId: z.string().optional(),
    whatsappUserId: z.string().optional(),
    instagramUserId: z.string().optional(),
  })
  .default({});

export type TIdentifiers = z.infer<typeof IdentifiersSchema>;
export type TPlatform = z.infer<typeof PlatformSchema>;
