import { z } from "zod";

export const ZChatBotKnowledgeSchema = z.object({
  source: z.string().optional(),
  type: z.string().optional(),
  data: z.string().optional(),
  name: z.string().nullable().optional(),
});

export const ZChatBotSettingSchema = z.object({
  chatbotId: z.string(),

  welcomeMessage: z.string().default("Hello! How can I help you today?"),

  fallbackMessage: z
    .string()
    .default(
      "I apologize, but I didn't understand that. Could you please rephrase your question?"
    ),

  showWelcomeMessage: z.boolean().default(true),

  thankyouMessage: z
    .string()
    .default(
      "It's been a pleasure chatting with you today, Please take a moment to drop us your rating"
    ),

  waitingMessage: z
    .string()
    .default("Please wait while we connect you to our support representative"),

  enableTypingIndicator: z.boolean().default(true),

  enableWidgetMessage: z.boolean().default(true),

  widgetMessageOnline: z
    .object({
      content: z.string().default("Hey there!"),
      subHeading: z.string().default("How can we help you?"),
    })
    .default({ content: "Hey there!", subHeading: "How can we help you?" }),

  widgetMessageOffline: z
    .object({
      content: z.string().default("We're offline"),
      subHeading: z.string().default("Leave a message"),
    })
    .default({ content: "We're offline", subHeading: "Leave a message" }),

  widgetPosition: z
    .enum(["left-bottom", "right-bottom"])
    .default("right-bottom"),

  language: z.enum(["english", "hindi"]).default("english"),

  enableRantingAndFeedback: z.boolean().default(true),

  ratingAndFeedback: z
    .object({
      rating: z.number().min(1).max(5).default(5),
      feedback: z.string().optional(),
    })
    .default({ rating: 5, feedback: "" }),

  chat_transcript: z.boolean().default(true),

  enableVoiceNote: z.boolean().default(false),

  responseInterval: z.enum(["0", "1", "2"]).or(z.number().int()).default(0),

  theme: z.record(z.string(), z.any()).optional().default({}),
});

export const ZChatBotSuggestionSchema = z.array(z.string()).optional();

export const ZChatBotSchema = z.object({
  name: z.string().min(3, "Name is required and must be at least 3 characters"),
  description: z.string().optional(),
  knowledgeSources: ZChatBotKnowledgeSchema,
  suggestedQuestions: ZChatBotSuggestionSchema,
  chatbotSetting: ZChatBotSettingSchema,
});

export type TCreateChatBot = z.infer<typeof ZChatBotSchema>;
export type TUpdateChatBot = z.infer<typeof ZChatBotSchema>;
export type TChatBot = z.infer<typeof ZChatBotSchema>;
