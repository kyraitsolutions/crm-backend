import { z } from "zod";

export const KnowledgeSourceZod = z.object({
  sourceType: z.enum(["file", "text", "website"]),
  name: z.string().min(1),
  description: z.string().optional(),
  filePath: z.string().optional(),
  mimeType: z.string().optional(),
  fileSize: z.number().optional(),
  sourceUrl: z.string().url().optional(),
  extractedText: z.string(),
  language: z.string().optional(),
});

export type KnowledgeSourceDTO = z.infer<typeof KnowledgeSourceZod>;

export const ThemeZod = z.object({
  primaryColor: z.string().optional(),
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
  bubbleStyle: z.enum(["rounded", "square"]).optional(),
});

export type ThemeDTO = z.infer<typeof ThemeZod>;

export const ConversationSettingZod = z.object({
  model: z.string().min(1),
  temperature: z.number().min(0).max(1).optional(),
  systemPrompt: z.string().min(1),
  welcomeMessage: z.string().optional(),
  fallbackMessage: z.string().optional(),
  enableTypingIndicator: z.boolean().optional(),
  collectUserInfo: z.boolean().optional(),
  theme: ThemeZod.optional(),
});

export type ConversationSettingDTO = z.infer<typeof ConversationSettingZod>;

export const SuggestedQuestionZod = z.object({
  question: z.string().min(1),
});

export type SuggestedQuestionDTO = z.infer<typeof SuggestedQuestionZod>;

export const CreateChatbotZod = z.object({
  name: z.string().min(1),
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid userId"),
  accountId: z.string().optional(),
  knowledgeSources: z.array(KnowledgeSourceZod).optional(),
  conversationSettings: ConversationSettingZod,
  suggestedQuestions: z.array(SuggestedQuestionZod).optional(),
});

export type CreateChatbotDTO = z.infer<typeof CreateChatbotZod>;
