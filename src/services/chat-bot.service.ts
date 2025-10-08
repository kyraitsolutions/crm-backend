import { db } from "../db";
import { chatbotKnowledgeSources } from "../db/tables";
import { CreateChatBotDto } from "../dtos";
import { ChatbotRepository } from "../repositories";
import { ChatBotUtil, GeminiAIUtil } from "../utils";

export class ChatBotService {
  private repo: ChatbotRepository;
  private geminiAIUtil: GeminiAIUtil;
  constructor() {
    this.repo = new ChatbotRepository();
    this.geminiAIUtil = new GeminiAIUtil();
  }
  async getChatBots() {}
  async createChatBot(userId: number, createChatBotDto: CreateChatBotDto) {
    return db.transaction(async (tx) => {
      const chatbot = await this.repo.createChatbot(tx, {
        name: createChatBotDto.name,
        description: createChatBotDto.description,
        userId,
      });
      let source: typeof chatbotKnowledgeSources.$inferSelect;
      if (createChatBotDto.knowledgeBase) {
        source = await this.repo.addKnowledgeSource(tx, {
          chatbotId: chatbot.id,
          type: createChatBotDto.knowledgeBase.type ?? null,
          name: createChatBotDto.name,
          sourceUrl: createChatBotDto.knowledgeBase.url,
          rawText: createChatBotDto.knowledgeBase.manual,
          metadata: { files: createChatBotDto.knowledgeBase.files },
        });
        if (createChatBotDto.knowledgeBase.manual) {
          const chunks = ChatBotUtil.chunkText(
            createChatBotDto.knowledgeBase.manual
          );
          const generateEmbedding = await this.geminiAIUtil.generateEmbedding(
            chunks
          );

          const chunkData = await Promise.all(
            chunks.map(async (c, idx) => ({
              chatbotId: chatbot.id,
              sourceId: source.id,
              content: c,
              chunkIndex: idx,
              tokenCount: c.split(" ").length,
              embedding: generateEmbedding[idx],
              metadata: {},
            }))
          );
          await this.repo.addKnowledgeChunks(tx, chunkData);
        }
      }

      if (createChatBotDto.suggestions?.length) {
        const questions = createChatBotDto.suggestions.map((q, idx) => ({
          chatbotId: chatbot.id,
          question: q,
          order: idx,
        }));
        await this.repo.addSuggestedQuestions(tx, questions);
      }
      if (createChatBotDto.conversation) {
        await this.repo.addConversationSettings(tx, {
          chatbotId: chatbot.id,
          welcomeMessage: createChatBotDto.conversation.welcomeMessage,
          fallbackResponse: createChatBotDto.conversation.fallbackMessage,
          emailCapture: createChatBotDto.conversation.emailCapture ?? false,
          systemPrompt: "",
          temperature: 1,
          maxTokens: 500,
        });
        if (createChatBotDto.theme) {
          await this.repo.addTheme(tx, {
            chatbotId: chatbot.id,
            theme: createChatBotDto.theme,
          });
        }
      }
      return chatbot;
    });
  }
  async updateChatBot(
    userId: number,
    chatbotId: number,
    updateDto: CreateChatBotDto
  ) {
    return db.transaction(async (tx) => {
      const chatbot = await this.repo.updateChatbot(tx, chatbotId, {
        name: updateDto.name,
        description: updateDto.description,
        userId,
      });

      if (updateDto.knowledgeBase) {
        const source = await this.repo.updateKnowledgeSource(tx, chatbotId, {
          type: updateDto.knowledgeBase.type ?? null,
          name: updateDto.name,
          sourceUrl: updateDto.knowledgeBase.url,
          rawText: updateDto.knowledgeBase.manual,
          metadata: { files: updateDto.knowledgeBase.files },
        });

        if (updateDto.knowledgeBase.manual) {
          const chunks = ChatBotUtil.chunkText(updateDto.knowledgeBase.manual);
          const embeddings = await this.geminiAIUtil.generateEmbedding(chunks);
          console.log(
            chunks.length,
            embeddings.length,
            "chunks and embeddings length"
          );

          const chunkData = await Promise.all(
            chunks.map(async (c, idx) => ({
              chatbotId,
              sourceId: source.id,
              content: c,
              chunkIndex: idx,
              tokenCount: c.split(" ").length,
              embedding: embeddings[idx],
              metadata: {},
            }))
          );

          await this.repo.deleteKnowledgeChunks(tx, chatbotId, source.id);
          await this.repo.addKnowledgeChunks(tx, chunkData);
        }
      }
      if (updateDto.suggestions) {
        await this.repo.deleteSuggestedQuestions(tx, chatbotId);

        const questions = updateDto.suggestions.map((q, idx) => ({
          chatbotId,
          question: q,
          order: idx,
        }));
        await this.repo.addSuggestedQuestions(tx, questions);
      }
      if (updateDto.conversation) {
        await this.repo.updateConversationSettings(tx, chatbotId, {
          welcomeMessage: updateDto.conversation.welcomeMessage,
          fallbackResponse: updateDto.conversation.fallbackMessage,
          emailCapture: updateDto.conversation.emailCapture ?? false,
          systemPrompt: "",
          temperature: 1,
          maxTokens: 500,
        });
      }
      if (updateDto.theme) {
        await this.repo.updateTheme(tx, chatbotId, {
          theme: updateDto.theme,
        });
      }

      return chatbot;
    });
  }
  async deleteChatBot() {}
}
