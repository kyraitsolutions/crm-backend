import mongoose from "mongoose";
import { ChatbotRepository } from "../repositories/chat-bot.repository";
import { CreateChatbotDto, ChatbotDto } from "../dtos/chat-bot.dto";
import { GeminiAIUtil } from "../utils/gemini-ai.util";

export class ChatbotService {
  private repository: ChatbotRepository;
  private geminiAIUtil: GeminiAIUtil;

  constructor() {
    this.repository = new ChatbotRepository();
    this.geminiAIUtil = new GeminiAIUtil();
  }

  public async createChatbot(dto: CreateChatbotDto): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const chatbot = await this.repository.createChatbot(dto, session);

      for (const ks of dto.knowledgeSources || []) {
        const sourceDoc = await this.repository.createKnowledgeSources(
          chatbot._id.toString(),
          [ks],
          session
        );
        const sourceId = sourceDoc[0]._id.toString();
        const chunks = this.geminiAIUtil.chunkText(ks.extractedText, 500, 50);
        await this.repository.createKnowledgeChunks(
          chatbot._id.toString(),
          sourceId,
          chunks,
          session
        );
      }
      await this.repository.createConversationSetting(
        chatbot._id.toString(),
        dto.conversationSettings,
        session
      );

      await this.repository.createSuggestedQuestions(
        chatbot._id.toString(),
        dto.suggestedQuestions || [],
        session
      );

      await session.commitTransaction();
      session.endSession();

      // const fullChatbot = await this.repository.getChatbotById(
      //   chatbot._id.toString()
      // );
      // return fullChatbot as unknown as ChatbotDto;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  public async createChatbotByAccount(
    dto: CreateChatbotDto
  ): Promise<ChatbotDto> {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const chatbot = await this.repository.createChatbot(dto, session);
      for (const ks of dto.knowledgeSources || []) {
        const sourceDoc = await this.repository.createKnowledgeSources(
          chatbot._id.toString(),
          [ks],
          session
        );
        const sourceId = sourceDoc[0]._id.toString();

        const chunks = this.geminiAIUtil.chunkText(ks.extractedText, 500, 50);
        await this.repository.createKnowledgeChunks(
          chatbot._id.toString(),
          sourceId,
          chunks,
          session
        );
      }

      await this.repository.createConversationSetting(
        chatbot._id.toString(),
        dto.conversationSettings,
        session
      );

      await this.repository.createSuggestedQuestions(
        chatbot._id.toString(),
        dto.suggestedQuestions || [],
        session
      );

      await session.commitTransaction();
      session.endSession();

      const fullChatbot = await this.repository.getChatbotById(
        chatbot._id.toString()
      );
      return fullChatbot as unknown as ChatbotDto;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  public async getAllChatbots(userId: string): Promise<ChatbotDto[]> {
    const chatbots = await this.repository.getAllChatbots(userId);
    return chatbots as unknown as ChatbotDto[];
  }

  public async getAllChatbotsByAccount(
    userId: string,
    accountId: string
  ): Promise<ChatbotDto[]> {
    const chatbots = await this.repository.getAllChatbotsByAccount(
      userId,
      accountId
    );
    return chatbots as unknown as ChatbotDto[];
  }

  public async getChatbotById(id: string): Promise<ChatbotDto> {
    const chatbot = await this.repository.getChatbotById(id);
    if (!chatbot) throw new Error("Chatbot not found");
    return chatbot as unknown as ChatbotDto;
  }
  public async updateChatbot(
    id: string,
    dto: CreateChatbotDto
  ): Promise<ChatbotDto> {
    const updated = await this.repository.updateChatbot(id, {
      name: dto.name,
      accountId: dto.accountId,
    });
    if (!updated) throw new Error("Chatbot not found");
    const fullChatbot = await this.repository.getChatbotById(id);
    return fullChatbot as unknown as ChatbotDto;
  }

  public async deleteChatbot(id: string): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await this.repository.deleteNestedData(id, session);
      await this.repository.deleteChatbot(id);
      await session.commitTransaction();
      session.endSession();
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }
}
