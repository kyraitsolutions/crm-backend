import { z } from "zod";

export const ZChatBotSchema = z.object({
  name: z.string().min(3, "Name is required and must be at least 3 characters"),
  userId: z.string(),
  accountId: z.string().nullable().optional(),

  // --- Config Section ---
  config: z.object({
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

    language: z.enum(["english", "hindi"]).default("english"),
    enableRantingAndFeedback: z.boolean().default(true),

    ratingAndFeedback: z
      .object({
        rating: z.number().min(1).max(5).default(5),
        feedback: z.string().optional().default(""),
      })
      .default({ rating: 5, feedback: "" }),

    chat_transcript: z.boolean().default(true),
    enableVoiceNote: z.boolean().default(false),
    responseInterval: z.enum(["0", "1", "2"]).or(z.number().int()).default(0),
    initiateChatbot: z.enum(["immediate", "action", ""]).default("immediate"),
    showBranding: z.boolean().default(true),
  }),

  // --- Theme Section ---
  theme: z.object({
    brandColor: z.string().default("#3b5d50"),
    contrastColor: z.string().default("#fefefe"),
    backgroundColor: z.string().default("#ffffff"),
    messageColor: z.string().default("#f1f5f9"),
    userMessageColor: z.string().default("#3b5d50"),
    typeface: z.string().default("Inter"),
    fontSize: z.number().default(14),
    fontWeight: z.string().default("normal"),
    avatarStyle: z.string().default("bubble"),
    avatarUrl: z.string().optional().default(""),
    showAvatar: z.boolean().default(true),
    roundedCorners: z.boolean().default(true),
    borderWidth: z.number().default(1),
    borderColor: z.string().default("#e2e8f0"),
    widgetPosition: z.string().default("bottom-right"),
    showLauncher: z.boolean().default(true),
    launcherLabel: z.string().default(""),
    launcherSize: z.number().default(56),
    messageAlignment: z.string().default("left"),
    showTimestamps: z.boolean().default(true),
    animationStyle: z.string().default("slide"),
    shadowIntensity: z.number().default(20),
    opacity: z.number().default(100),
    customCSS: z.string().default(""),
  }),

  // --- Conversation Section ---
  conversation: z.object({
    welcomeMessage: z
      .string()
      .default("Hello! How can I help you today?"),
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
  }),
});

export type TChatBot = z.infer<typeof ZChatBotSchema>;
export type TCreateChatBot = z.infer<typeof ZChatBotSchema>;
export type TUpdateChatBot = z.infer<typeof ZChatBotSchema>;
