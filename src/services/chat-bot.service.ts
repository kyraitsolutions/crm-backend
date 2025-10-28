// import { UserProfileRepository } from './../repositories/userprofile.repository';
import { ChatBotDetailDto, ChatBotListDto, CreateChatBotDto } from "../dtos";
import { ChatbotRepository } from "../repositories";
import { ChatBotUtil, GeminiAIUtil } from "../utils";
// import { AccountRepository } from '../repositories/account.repository';

export class ChatBotService {
  private repo: ChatbotRepository;
  // private userprofileRepository:UserProfileRepository;
  // private accountRepository:AccountRepository;
  private geminiAIUtil: GeminiAIUtil;

  constructor() {
    this.repo = new ChatbotRepository();
    // this.accountRepository=new AccountRepository();
    // this.userprofileRepository = new UserProfileRepository();
    this.geminiAIUtil = new GeminiAIUtil();
  }

  async getAllChatBotsByUserId(userId:string):Promise<ChatBotListDto[]|[]> {
    const chatbots= await this.repo.findAllByUserId(userId);
    return chatbots?.map((chatbot)=>new ChatBotListDto(chatbot))??[];
  }
  async getChatBots(accountId:string):Promise<ChatBotListDto[]|[]> {
    const chatbots= await this.repo.findAllByAccountId(accountId);
    return chatbots?.map((chatbot)=>new ChatBotListDto(chatbot))??[];
  }


  async getChatBotById(userId:string,chatBotId:string):Promise<ChatBotDetailDto| null> {
    const chatbot= await this.repo.findByIdAndUserId(chatBotId,userId);
    console.log("m,cvxc", chatbot[0].knowledgeSources);
    console.log("m,cvxc", chatbot[0]);
    return new ChatBotDetailDto(chatbot[0])??null;
  }



  async createChatBot(
    userId: string,
    accountId: string,
    createChatBotDto: CreateChatBotDto
  ): Promise<ChatBotListDto> {
    // 1️⃣ Create the chatbot
    const chatbot = await this.repo.createChatbot({
      name: createChatBotDto.name,
      userId,
      accountId: accountId || null,
    });

    console.log("✅ Created chatbot:", chatbot);

    // 2️⃣ Handle Knowledge Sources
    if (
      Array.isArray(createChatBotDto.knowledgeSources) &&
      createChatBotDto.knowledgeSources.length > 0
    ) {
      for (const ks of createChatBotDto.knowledgeSources) {
        if (!ks.data?.trim()) {
          console.warn("⚠️ Skipping empty knowledge source:", ks);
          continue;
        }

        const source = await this.repo.addKnowledgeSource({
          chatbotId: chatbot._id,
          type: ks.type ?? "text",
          name: ks.name || createChatBotDto.name,
          source: ks.source || "manual",
          data: ks.data,
        });

        // If manual text provided, split and embed
        if (ks.data) {
          const chunks = ChatBotUtil.chunkText(ks.data);
          const embeddings = await this.geminiAIUtil.generateEmbedding(chunks);

          const chunkData = chunks.map((c, idx) => ({
            chatbotId: chatbot._id,
            sourceId: source._id,
            text: c,
            embedding: embeddings[idx],
          }));

          await this.repo.addKnowledgeChunks(chunkData);
        }
      }
    }

    // 3️⃣ Suggested Questions
    if (createChatBotDto.suggestedQuestions?.length) {
      const questions = createChatBotDto.suggestedQuestions.map((q) => ({
        chatbotId: chatbot._id,
        question: q,
      }));
      await this.repo.addSuggestedQuestions(questions);
    }

    // 4️⃣ Conversation Settings
    if (createChatBotDto.conversationSettings) {
      const settings = createChatBotDto.conversationSettings;
      await this.repo.addConversationSettings({
        chatbotId: chatbot._id,
        model: settings.model || "gemini-pro",
        temperature: settings.temperature || 1,
        prompt: settings.prompt || "hi",
        showWelcomeMessage: settings.showWelcomeMessage ?? true,
        welcomeMessage: settings.welcomeMessage,
        fallbackMessage: settings.fallbackMessage,
        enableTypingIndicator: settings.enableTypingIndicator ?? true,
        collectUserInfo: settings.collectUserInfo,
        theme: settings.theme,
      });
    }

    return new ChatBotListDto(chatbot);
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
