import { UserProfileRepository } from './../repositories/userprofile.repository';
import { CreateChatBotDto } from "../dtos";
import { ChatbotRepository } from "../repositories";
import { ChatBotUtil, GeminiAIUtil } from "../utils";
import { AccountRepository } from '../repositories/account.repository';

export class ChatBotService {
  private repo: ChatbotRepository;
  private userprofileRepository:UserProfileRepository;
  private accountRepository:AccountRepository;
  private geminiAIUtil: GeminiAIUtil;

  constructor() {
    this.repo = new ChatbotRepository();
    this.accountRepository=new AccountRepository();
    this.userprofileRepository = new UserProfileRepository();
    this.geminiAIUtil = new GeminiAIUtil();
  }

  async getAllChatBotsByUserId(userId:string):Promise<any> {
    return await this.repo.findAllByUserId(userId);
  }
  async getChatbots(userId:string):Promise<any> {
    return await this.repo.findAllByAccountId(userId);
  }



  async createChatBot(userId: string, createChatBotDto: CreateChatBotDto) {
    const user = await this.userprofileRepository.findByUserId(userId);

    
    let chatbot;

    if(user?.accountType==="individual"){
      chatbot = await this.repo.createChatbot({
        name: createChatBotDto.name,
        userId,
        accountId:null
      });
    }
    else{
      const account=await this.accountRepository.findOne(userId);
      console.log(account);
      chatbot = await this.repo.createChatbot({
        name: createChatBotDto.name,
        userId,
        accountId:account?.id
      });
    }
    

    console.log("Create chatbot:", chatbot)

    if (createChatBotDto.knowledgeBase) {
      const source = await this.repo.addKnowledgeSource({
        chatbotId: chatbot._id,
        type: createChatBotDto.knowledgeBase.type ?? "text",
        name: createChatBotDto.name,
        source: createChatBotDto.knowledgeBase.url ?? "manual",
        data: createChatBotDto.knowledgeBase.manual,
      });

      if (createChatBotDto.knowledgeBase.manual) {
        const chunks = ChatBotUtil.chunkText(
          createChatBotDto.knowledgeBase.manual
        );
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

    if (createChatBotDto.suggestions?.length) {
      const questions = createChatBotDto.suggestions.map((q) => ({
        chatbotId: chatbot._id,
        question: q,
      }));
      await this.repo.addSuggestedQuestions(questions);
    }

    if (createChatBotDto.conversation) {
      await this.repo.addConversationSettings({
        chatbotId: chatbot._id,
        model: "gemini-pro",
        temperature: createChatBotDto.conversation.temperature || 1,
        prompt: createChatBotDto.conversation.prompt || "hi",
        showWelcomeMessage:createChatBotDto.conversation.showWelcomeMessage ||true,
        welcomeMessage:createChatBotDto.conversation.welcomeMessage,
        fallbackMessage:createChatBotDto.conversation.fallbackMessage,
        enableTypingIndicator:createChatBotDto.conversation.enableTypingIndicator||true,
        collectUserInfo:createChatBotDto.conversation.collectUserInfo,
        theme:createChatBotDto.conversation.theme
      });
    }

    // if (createChatBotDto.theme) {
    //   await this.repo.addTheme({
    //     chatbotId: chatbot._id,
    //     ...createChatBotDto.theme,
    //   });
    // }

    return chatbot;
  }

  async updateChatBot(
    // userId: string,
    chatbotId: string,
    updateDto: CreateChatBotDto
  ) {
    const chatbot = await this.repo.updateChatbot(chatbotId, {
      name: updateDto.name,
      description: updateDto.description,
    });

    if (!chatbot) {
      throw new Error("Chatbot not found");
    }

    if (updateDto.knowledgeBase) {
      const source = await this.repo.updateKnowledgeSource(chatbotId, {
        type: updateDto.knowledgeBase.type ?? "text",
        name: updateDto.name,
        source: updateDto.knowledgeBase.url ?? "manual",
        data: updateDto.knowledgeBase.manual,
      });

      if (source && updateDto.knowledgeBase.manual) {
        const chunks = ChatBotUtil.chunkText(updateDto.knowledgeBase.manual);
        const embeddings = await this.geminiAIUtil.generateEmbedding(chunks);

        const chunkData = chunks.map((c, idx) => ({
          chatbotId,
          sourceId: source._id,
          text: c,
          embedding: embeddings[idx],
        }));

        await this.repo.deleteKnowledgeChunks(chatbotId, source._id);
        await this.repo.addKnowledgeChunks(chunkData);
      }
    }

    if (updateDto.suggestions) {
      await this.repo.deleteSuggestedQuestions(chatbotId);

      const questions = updateDto.suggestions.map((q) => ({
        chatbotId,
        question: q,
      }));
      await this.repo.addSuggestedQuestions(questions);
    }

    if (updateDto.conversation) {
      await this.repo.updateConversationSettings(chatbotId, {
        temperature: updateDto.conversation.temperature,
        prompt: updateDto.conversation.prompt,
      });
    }

    if (updateDto.theme) {
      await this.repo.updateTheme(chatbotId, updateDto.theme);
    }

    return chatbot;
  }

  async deleteChatBot() {
    // Implement logic to delete a chatbot
  }
}
