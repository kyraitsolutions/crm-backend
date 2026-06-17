import { z } from "zod";

export const ZChatBotSchema = z.object({
  name: z.string().min(3, "Name is required and must be at least 3 characters"),
  description: z.string().default("Best chatbot to generate leads."),
  status: z.boolean().default(true),
  userId: z.string(),
  accountId: z.string().nullable().optional(),
  flowId: z.string().nullable().optional(),

  // --- Config Section ---
  config: z.object({
    showTypingIndicator: z.boolean().default(true),
    enableWidgetMessage: z.boolean().default(true),
    language: z.enum(["english", "hindi"]).default("english"),
    enableRantingAndFeedback: z.boolean().default(true),
    ratingAndFeedback: z
      .object({
        rating: z.number().int().min(1).max(5).default(5),
        feedback: z.string().default(""),
      })
      .default({ rating: 5, feedback: "" }),
    chat_transcript: z.boolean().default(true),
    enableVoiceNote: z.boolean().default(false),
    responseInterval: z
      .union([z.literal(0), z.literal(1), z.literal(2)])
      .default(0),
    initiateChatbot: z.enum(["immediate", "action"]).default("immediate"),
    showBranding: z.boolean().default(true),
    autoOpenAfterSeconds: z.number().nullable().default(null),
    brandLabelText: z.string().default(""),
    enableBrandLabel: z.boolean().default(true),
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
    avatarUrl: z.string().optional(),
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
    welcomeMessage: z.string().default("Hello! How can I help you today?"),
    fallbackMessage: z
      .string()
      .default(
        "I apologize, but I didn't understand that. Could you please rephrase your question?",
      ),
    showWelcomeMessage: z.boolean().default(true),
    thankyouMessage: z
      .string()
      .default(
        "It's been a pleasure chatting with you today, Please take a moment to drop us your rating",
      ),
    waitingMessage: z
      .string()
      .default(
        "Please wait while we connect you to our support representative",
      ),
  }),
});

// chatbot flow types

export const ChatbotElementSchema = z.object({
  id: z.string(), // frontend UUID or id
  type: z.enum(["text", "image", "video", "audio"]).default("text"),
  content: z.string().default(""),
  // default to current ISO timestamp if not provided
  choices: z.array(z.string()).optional(),

  date: z
    .string()
    .optional()
    .default(() => new Date().toISOString()),
});

/* -------------------------
   Node data schema
   ------------------------- */
export const ChatbotNodeDataSchema = z.object({
  label: z.string().default(""),
  type: z.string().default(""),
  payload: z.any().optional(),
});

/* -------------------------
   Node schema
   ------------------------- */
export const ChatbotNodeSchema = z.object({
  id: z.string(), // use UUID from frontend
  type: z.enum(["chat", "form"]).default("chat"),
  position: z
    .object({
      x: z.number().default(0),
      y: z.number().default(0),
    })
    .default({ x: 0, y: 0 }),
  width: z.number().optional().default(250),
  height: z.number().optional().default(100),
  selected: z.boolean().optional().default(false),
  dragging: z.boolean().optional().default(false),
  data: ChatbotNodeDataSchema.default({ label: "", type: "", payload: null }),
});

/* -------------------------
   Edge schema
   ------------------------- */
export const ChatbotEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  animated: z.boolean().optional().default(false),
  sourceHandle: z.string().nullable().optional().default(null),
  targetHandle: z.string().nullable().optional().default(null),
});

/* -------------------------
   Main flow schema
   ------------------------- */
export const CreateChatFlowSchema = z.object({
  // If you don't want to enforce ObjectId format, change to z.string()
  name: z.string(),
  accountId: z.string(),
  nodes: z.array(ChatbotNodeSchema).default([]),
  edges: z.array(ChatbotEdgeSchema).default([]),
  createdBy: z.string(),
  rganizationId: z.string().optional(),
});

/* -------------------------
   Export TypeScript types
   ------------------------- */
export type ChatbotElement = z.infer<typeof ChatbotElementSchema>;
export type ChatbotNodeData = z.infer<typeof ChatbotNodeDataSchema>;
export type TChatbotNode = z.infer<typeof ChatbotNodeSchema>;
export type TChatbotEdge = z.infer<typeof ChatbotEdgeSchema>;
export type TCreateChatFlow = z.infer<typeof CreateChatFlowSchema>;

export type TChatBot = z.infer<typeof ZChatBotSchema>;
export type TCreateChatBot = z.infer<typeof ZChatBotSchema>;
export type TUpdateChatBot = z.infer<typeof ZChatBotSchema>;
