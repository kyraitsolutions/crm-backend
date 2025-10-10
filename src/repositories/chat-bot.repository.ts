import {
  ChatbotModel,
  ChatbotKnowledgeSourceModel,
  ChatbotKnowledgeChunkModel,
  ChatbotSuggestedQuestionModel,
  ChatbotConversationSettingModel,
  ChatbotThemeModel,
} from "../models/chatbot.model";

export class ChatbotRepository {
  async createChatbot(data: any) {
    return await ChatbotModel.create(data);
  }

  async addKnowledgeSource(data: any) {
    return await ChatbotKnowledgeSourceModel.create(data);
  }

  async addKnowledgeChunks(data: any[]) {
    if (!data.length) return [];
    return await ChatbotKnowledgeChunkModel.insertMany(data);
  }

  async addSuggestedQuestions(data: any[]) {
    if (!data.length) return [];
    return await ChatbotSuggestedQuestionModel.insertMany(data);
  }

  async addConversationSettings(data: any) {
    return await ChatbotConversationSettingModel.create(data);
  }

  async addTheme(data: any) {
    return await ChatbotThemeModel.create(data);
  }

  async updateChatbot(chatbotId: string, data: any) {
    return await ChatbotModel.findByIdAndUpdate(chatbotId, data, { new: true });
  }

  async updateKnowledgeSource(chatbotId: string, data: any) {
    return await ChatbotKnowledgeSourceModel.findOneAndUpdate({ chatbotId }, data, {
      new: true,
    });
  }

  async updateConversationSettings(chatbotId: string, data: any) {
    return await ChatbotConversationSettingModel.findOneAndUpdate(
      { chatbotId },
      data,
      { new: true }
    );
  }

  async updateTheme(chatbotId: string, data: any) {
    return await ChatbotThemeModel.findOneAndUpdate({ chatbotId }, data, {
      new: true,
    });
  }

  async deleteKnowledgeChunks(chatbotId: string, sourceId: string) {
    return await ChatbotKnowledgeChunkModel.deleteMany({ chatbotId, sourceId });
  }

  async deleteSuggestedQuestions(chatbotId: string) {
    return await ChatbotSuggestedQuestionModel.deleteMany({ chatbotId });
  }
}
