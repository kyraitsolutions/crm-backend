import { z } from "zod";

export const ZChatBotKnowledgeSchema = z.object({
  url: z.string().optional(),
  files: z.array(z.string()).optional(),
  manual: z.string().optional(),
  type: z.number().nullable().optional(),
});

export const ZChatBotConversationSchema = z.object({
  temperature:z.string().optional(),
  promt:z.string().optional(),
  showWelcomeMessage: z.boolean().optional(),
  welcomeMessage: z.string().optional(),
  emailCapture: z.boolean().optional(),
  phoneNumberCapture: z.boolean().optional(),
  fallbackMessage: z.string().optional(),
  enableTypingIndicator:z.boolean(),
  collectUserInfo:z.boolean(),
  theme: z.record(z.string(), z.any()).optional(),
});

export const ZChatBotSuggestionSchema = z.array(z.string()).optional();

export const ZChatBotSchema = z.object({
  name: z.string().min(3, "Name is required and must be at least 3 characters"),
  description: z.string().optional(),
  knowledgeBase: ZChatBotKnowledgeSchema,
  suggestions: ZChatBotSuggestionSchema,
  conversation: ZChatBotConversationSchema,
});

export type TCreateChatBot = z.infer<typeof ZChatBotSchema>;
export type TUpdateChatBot = z.infer<typeof ZChatBotSchema>;
export type TChatBot = z.infer<typeof ZChatBotSchema>;
