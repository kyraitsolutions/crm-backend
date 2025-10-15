import { Schema, model } from "mongoose";

const chatbotSchema = new Schema(
  {
    name: { type: String, required: true },
    accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    // 
    theme:{}

  },
  { timestamps: true }
);

const chatbotKnowledgeSourceSchema = new Schema({
  chatbotId: { type: Schema.Types.ObjectId, ref: "Chatbot", required: true },
  source: { type: String, required: true },
  type: { type: String, enum: ["file", "text", "website"], required: true },
  data: { type: String, required: true },
  name: { type: String, required: true },
});

const chatbotKnowledgeChunkSchema = new Schema({
  chatbotId: { type: Schema.Types.ObjectId, ref: "Chatbot", required: true },
  sourceId: {
    type: Schema.Types.ObjectId,
    ref: "ChatbotKnowledgeSource",
    required: true,
  },
  text: { type: String, required: true },
  embedding: { type: [Number], required: true },
});

const chatbotSuggestedQuestionSchema = new Schema({
  chatbotId: { type: Schema.Types.ObjectId, ref: "Chatbot", required: true },
  question: { type: String, required: true },
});

const chatbotConversationSettingSchema = new Schema({
  chatbotId: { type: Schema.Types.ObjectId, ref: "Chatbot", required: true },
  model: { type: String, required: true },
  temperature: { type: Number, required: true },
  prompt: { type: String, required: true },
  welcomeMessage: {
    type: String,
    default: 'Hello! How can I help you today?'
  },
  fallbackMessage: {
    type: String,
    default: 'I apologize, but I didn\'t understand that. Could you please rephrase your question?'
  },
  tenableTypingIndicator: {
    type: Boolean,
    default: true
  },
  collectUserInfo: {
      type: Boolean,
      default: true
  }
});


export const ChatbotModel = model("Chatbot", chatbotSchema);
export const ChatbotKnowledgeSourceModel = model(
  "ChatbotKnowledgeSource",
  chatbotKnowledgeSourceSchema
);
export const ChatbotKnowledgeChunkModel = model(
  "ChatbotKnowledgeChunk",
  chatbotKnowledgeChunkSchema
);
export const ChatbotSuggestedQuestionModel = model(
  "ChatbotSuggestedQuestion",
  chatbotSuggestedQuestionSchema
);
export const ChatbotConversationSettingModel = model(
  "ChatbotConversationSetting",
  chatbotConversationSettingSchema
);
