// import { UserProfileRepository } from './../repositories/userprofile.repository';
import {
  ChatBotDetailDto,
  ChatBotListDto,
  CreateChatBotDto,
  ResponseChatBotDto,
} from "../dtos";
import { ChatbotRepository } from "../repositories";
// import { ChatBotUtil, GeminiAIUtil } from "../utils";
import { AccountRepository } from "../repositories/account.repository";

export class ChatBotService {
  private repo: ChatbotRepository;
  // private userprofileRepository:UserProfileRepository;
  private accountRepository: AccountRepository;
  // private geminiAIUtil: GeminiAIUtil;

  constructor() {
    this.repo = new ChatbotRepository();
    this.accountRepository = new AccountRepository();
    // this.userprofileRepository = new UserProfileRepository();
    // this.geminiAIUtil = new GeminiAIUtil();
  }

  async getAllChatBotsByUserId(
    userId: string
  ): Promise<ResponseChatBotDto[] | []> {
    const chatbots = await this.repo.findAllByUserId(userId);
    return chatbots?.map((chatbot) => new ResponseChatBotDto(chatbot)) ?? [];
  }
  async getChatBots(accountId: string): Promise<ResponseChatBotDto[] | []> {
    const chatbots = await this.repo.findAllByAccountId(accountId);
    // console.log(chatbots)
    return chatbots?.map((chatbot) => new ResponseChatBotDto(chatbot)) ?? [];
  }

  async getChatBotById(
    userId: string,
    chatBotId: string,
    accountId: string
  ): Promise<ChatBotDetailDto | null> {
    const chatbot = await this.repo.findChatbotById(
      userId,
      chatBotId,
      accountId
    );
    return new ChatBotDetailDto(chatbot[0]) ?? null;
  }

  async createChatBot(
    userId: string,
    accountId: string,
    createChatBotDto: CreateChatBotDto
  ): Promise<ResponseChatBotDto> {
    console.log(userId, accountId);
    const isAccountExist = await this.accountRepository.findOne(
      userId,
      accountId
    );
    console.log("sdfdfgdf", isAccountExist);

    if (!isAccountExist) {
      throw new Error("Account not found for this account id");
    }

    const chatbot = await this.repo.createChatbot({
      ...createChatBotDto,
      userId,
      accountId: accountId || null,
    });

    console.log("✅ Created chatbot:", chatbot);

    return new ResponseChatBotDto(chatbot);
  }

  // async updateChatBot(chatbotId: string, updateDto: CreateChatBotDto) {
  //   const chatbot = await this.repo.updateChatbot(chatbotId, {
  //     name: updateDto.name,
  //     description: updateDto.description,
  //   });

  //   if (!chatbot) {
  //     throw new Error("Chatbot not found");
  //   }

  //   // ✅ Handle Knowledge Base Update
  //   if (updateDto.knowledgeSources) {
  //     const { type, source, manual } = updateDto.knowledgeSources;

  //     // Only pass `data` if manual content exists
  //     const sourceData: any = {
  //       type: type ?? "text",
  //       name: updateDto.name,
  //       source: url ?? "manual",
  //     };

  //     if (manual && manual.trim() !== "") {
  //       sourceData.data = manual;
  //     }

  //     const source = await this.repo.updateKnowledgeSource(chatbotId, sourceData);

  //     // ✅ Only update embeddings if manual data is present
  //     if (source && manual && manual.trim() !== "") {
  //       const chunks = ChatBotUtil.chunkText(manual);
  //       const embeddings = await this.geminiAIUtil.generateEmbedding(chunks);

  //       const chunkData = chunks.map((c, idx) => ({
  //         chatbotId,
  //         sourceId: source._id,
  //         text: c,
  //         embedding: embeddings[idx],
  //       }));

  //       await this.repo.deleteKnowledgeChunks(chatbotId, source._id);
  //       await this.repo.addKnowledgeChunks(chunkData);
  //     }
  //   }

  //   // ✅ Update Suggested Questions
  //   if (updateDto.suggestions?.length) {
  //     await this.repo.deleteSuggestedQuestions(chatbotId);

  //     const questions = updateDto.suggestions.map((q) => ({
  //       chatbotId,
  //       question: q,
  //     }));

  //     await this.repo.addSuggestedQuestions(questions);
  //   }

  //   // ✅ Update Conversation Settings
  //   if (updateDto.conversation) {
  //     await this.repo.updateConversationSettings(chatbotId, {
  //       temperature: updateDto.conversation.temperature,
  //       prompt: updateDto.conversation.prompt,
  //     });
  //   }

  //   // ✅ Update Theme Settings
  //   if (updateDto.theme) {
  //     await this.repo.updateTheme(chatbotId, updateDto.theme);
  //   }

  //   return chatbot;
  // }

  async deleteChatBot() {
    // Implement logic to delete a chatbot
  }
}
