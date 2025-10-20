import { Schema, model } from "mongoose";

const chatbotSchema = new Schema(
  {
    name: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    accountId: { type: Schema.Types.ObjectId, ref: "Account" },
  },
  { timestamps: true }
);

const knowledgeSourceSchema = new Schema(
  {
    chatbotId: { type: Schema.Types.ObjectId, ref: "Chatbot", required: true },

    sourceType: {
      type: String,
      enum: ["file", "text", "website"],
      required: true,
    },

    name: { type: String, required: true },
    description: { type: String },

    filePath: { type: String },
    mimeType: { type: String },
    fileSize: { type: Number },
    sourceUrl: { type: String },
    extractedText: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "processing", "complete", "failed"],
      default: "complete",
    },
    language: { type: String },
    uploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const knowledgeChunkSchema = new Schema(
  {
    chatbotId: { type: Schema.Types.ObjectId, ref: "Chatbot", required: true },
    sourceId: {
      type: Schema.Types.ObjectId,
      ref: "KnowledgeSource",
      required: true,
    },
    text: { type: String, required: true },
    embedding: { type: [Number], required: true },

    tokenCount: Number,
    chunkIndex: Number,
  },
  { timestamps: true }
);

const suggestedQuestionSchema = new Schema(
  {
    chatbotId: { type: Schema.Types.ObjectId, ref: "Chatbot", required: true },
    question: { type: String, required: true },
  },
  { timestamps: true }
);

const conversationSettingSchema = new Schema(
  {
    chatbotId: { type: Schema.Types.ObjectId, ref: "Chatbot", required: true },

    model: { type: String, required: true },
    temperature: { type: Number, default: 0.7 },
    systemPrompt: { type: String, required: true },

    welcomeMessage: {
      type: String,
      default: "Hello! How can I help you today?",
    },
    fallbackMessage: {
      type: String,
      default:
        "I apologize, but I didn’t understand that. Could you please rephrase?",
    },

    enableTypingIndicator: { type: Boolean, default: true },
    collectUserInfo: { type: Boolean, default: true },

    theme: {
      primaryColor: { type: String, default: "#4F46E5" },
      backgroundColor: { type: String, default: "#FFFFFF" },
      textColor: { type: String, default: "#000000" },
      bubbleStyle: {
        type: String,
        enum: ["rounded", "square"],
        default: "rounded",
      },
    },
  },
  { timestamps: true }
);

export const ChatbotModel = model("Chatbot", chatbotSchema);
export const KnowledgeSourceModel = model(
  "KnowledgeSource",
  knowledgeSourceSchema
);
export const KnowledgeChunkModel = model(
  "KnowledgeChunk",
  knowledgeChunkSchema
);
export const SuggestedQuestionModel = model(
  "SuggestedQuestion",
  suggestedQuestionSchema
);
export const ConversationSettingModel = model(
  "ConversationSetting",
  conversationSettingSchema
);
