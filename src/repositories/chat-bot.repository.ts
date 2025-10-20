import mongoose from "mongoose";
import { CreateChatbotDto } from "../dtos";
import {
  ChatbotModel,
  KnowledgeSourceModel,
  SuggestedQuestionModel,
  ConversationSettingModel,
  KnowledgeChunkModel,
} from "../models/chatbot.model";

export class ChatbotRepository {
  async createChatbot(dto: CreateChatbotDto, session: mongoose.ClientSession) {
    return ChatbotModel.create(
      [
        {
          name: dto.name,
          userId: dto.userId,
          accountId: dto.accountId,
        },
      ],
      { session }
    ).then((res) => res[0]);
  }

  async createKnowledgeSources(
    chatbotId: string,
    knowledgeSources: any[],
    session: mongoose.ClientSession
  ) {
    if (!knowledgeSources?.length) return [];
    const sources = knowledgeSources.map((k) => ({ ...k, chatbotId }));
    return KnowledgeSourceModel.insertMany(sources, { session });
  }
  async createKnowledgeChunks(
    chatbotId: string,
    sourceId: string,
    chunks: string[],
    session: mongoose.ClientSession
  ) {
    if (!chunks?.length) return [];
    const docs = chunks.map((text, index) => ({
      chatbotId,
      sourceId,
      text,
      embedding: [], // placeholder for embedding
      tokenCount: text.length, // or actual token count
      chunkIndex: index,
    }));
    return KnowledgeChunkModel.insertMany(docs, { session });
  }

  async createConversationSetting(
    chatbotId: string,
    setting: any,
    session: mongoose.ClientSession
  ) {
    return ConversationSettingModel.create(
      [
        {
          ...setting,
          chatbotId,
        },
      ],
      { session }
    ).then((res) => res[0]);
  }

  async createSuggestedQuestions(
    chatbotId: string,
    questions: any[],
    session: mongoose.ClientSession
  ) {
    if (!questions?.length) return [];
    const q = questions.map((q) => ({ ...q, chatbotId }));
    return SuggestedQuestionModel.insertMany(q, { session });
  }

  async getChatbotById(id: string) {
    return ChatbotModel.findById(id)
      .populate("knowledgeSources")
      .populate("conversationSettings")
      .populate("suggestedQuestions")
      .lean();
  }

  async getAllChatbots(userId: string) {
    return (
      ChatbotModel.find({ userId })
        .populate("knowledgeSources")
        // .populate("conversationSettings")
        // .populate("suggestedQuestions")
        .lean()
    );
  }

  async getAllChatbotsByAccount(userId: string, accountId: string) {
    return ChatbotModel.find({ accountId, userId })
      .populate("knowledgeSources")
      .populate("conversationSettings")
      .populate("suggestedQuestions")
      .lean();
  }

  async updateChatbot(id: string, dto: any) {
    return ChatbotModel.findByIdAndUpdate(id, dto, { new: true });
  }

  async deleteChatbot(id: string) {
    return ChatbotModel.findByIdAndDelete(id);
  }

  async deleteNestedData(chatbotId: string, session: mongoose.ClientSession) {
    await KnowledgeSourceModel.deleteMany({ chatbotId }, { session });
    await SuggestedQuestionModel.deleteMany({ chatbotId }, { session });
    await ConversationSettingModel.deleteMany({ chatbotId }, { session });
  }
}
