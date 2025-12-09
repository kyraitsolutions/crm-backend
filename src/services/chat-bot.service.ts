import {
  ChatBotListDto,
  ChatbotWithFlowDto,
  CreateChatBotDto,
  ResponseChatBotDto,
  ResponseChatBotFlowDto,
} from "../dtos";
import { USERROLE } from "../enums/user.enum";
import { TeamMember, TeamMemberAccountLeads } from "../models/team.model";
import { ChatbotRepository } from "../repositories";
import { AccountRepository } from "../repositories/account.repository";
import { TCreateChatBotFlow } from "../types";
import { ObjectId } from "mongodb";

export class ChatBotService {
  private repo: ChatbotRepository;
  private accountRepository: AccountRepository;
  // private chatbotFlowRepository :;

  constructor() {
    this.repo = new ChatbotRepository();
    this.accountRepository = new AccountRepository();
  }

  async getAllChatBotsByUserId(userId: string): Promise<ChatBotListDto[] | []> {
    const chatbots = await this.repo.findAllByUserId(userId);
    return chatbots?.map((chatbot) => new ChatBotListDto(chatbot)) ?? [];
  }
  async getChatBots(
    user: any,
    accountId: string
  ): Promise<ChatBotListDto[] | []> {
    let chatbots: any = [];
    const isAdmin = new ObjectId(USERROLE.ADMIN).equals(user.roleId);
    if (isAdmin) {
      chatbots = await this.repo.findAllByAccountId(user.id, accountId);
    } else {
      const isAccessed = await TeamMember.findOne({ userId: user.id });

      const isAccountAccess = await TeamMemberAccountLeads.findOne({
        teamMemberId: isAccessed._id,
        accountId: accountId,
      });

      console.log(isAccountAccess);
      if (isAccountAccess) {
        chatbots = await this.repo.findAllByAccountId(
          isAccessed.orgId,
          accountId
        );
      }
    }
    return chatbots?.map((chatbot) => new ChatBotListDto(chatbot)) ?? [];
  }

  async getChatBotWithFlow(
    accountId: string,
    chatbotId: string
  ): Promise<ChatbotWithFlowDto | null> {
    const chatbotWithFlow = await this.repo.findChatbotWithFlow(
      accountId,
      chatbotId
    );
    return new ChatbotWithFlowDto(chatbotWithFlow);
  }

  async getChatBotById(
    userId: string,
    accountId: string,
    chatbotId: string
  ): Promise<ResponseChatBotDto | null> {
    const chatbot = await this.repo.findChatbotById(
      userId,
      accountId,
      chatbotId
    );
    if (!chatbot) {
      throw new Error("Chatbot not Found");
    }
    return new ResponseChatBotDto(chatbot);
  }

  async createChatBot(
    userId: string,
    accountId: string,
    createChatBotDto: CreateChatBotDto
  ): Promise<ResponseChatBotDto> {
    const isAccountExist = await this.accountRepository.findOne(
      userId,
      accountId
    );

    if (!isAccountExist) {
      throw new Error("Account not found for this account id");
    }

    const chatbot = await this.repo.createChatbot({
      ...createChatBotDto,
      userId,
      accountId: accountId,
    });

    return new ResponseChatBotDto(chatbot);
  }

  async getChatBotFlowById(
    userId: string,
    accountId: string,
    chatbotId: string
  ): Promise<ResponseChatBotFlowDto | null> {
    const isAccountExist = await this.accountRepository.findOne(
      userId,
      accountId
    );

    if (!isAccountExist) {
      throw new Error("Account not found for this account id");
    }

    const chatbotFlow = await this.repo.findChatbotFlowById(
      accountId,
      chatbotId
    );

    if (!chatbotFlow) {
      throw new Error("Chatbot flow not Found");
    }
    return new ResponseChatBotFlowDto(chatbotFlow);
  }

  async createChatBotFlow(
    userId: string,
    accountId: string,
    chatBotId: string,
    createChatBotFlowDto: TCreateChatBotFlow
  ) {
    const isAccountExist = await this.accountRepository.findOne(
      userId,
      accountId
    );

    if (!isAccountExist) {
      throw new Error("Account not found for this account id");
    }

    const chatbotFlowPayload = {
      ...createChatBotFlowDto,
      userId,
      accountId,
      chatBotId,
    };

    const isChatbotFlowExist = await this.repo.findChatbotFlowById(
      accountId,
      chatBotId
    );

    if (isChatbotFlowExist) {
      this.repo.updateChatbotFlow(accountId, chatBotId, chatbotFlowPayload);
      return {
        update: true,
        docs: new ResponseChatBotFlowDto(isChatbotFlowExist),
      };
    }

    const chatbotFlow = await this.repo.createChatbotFlow(chatbotFlowPayload);

    return new ResponseChatBotFlowDto(chatbotFlow);
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

  async updateChatBot(
    userId: string,
    accountId: string,
    chatbotId: string,
    updateDto: CreateChatBotDto
  ) {
    const result = await this.repo.updateChatbot(
      userId,
      accountId,
      chatbotId,
      updateDto
    );
    if (!result) {
      throw new Error("Chatbot not found");
    }
    return result;
  }

  async deleteChatBot(
    userId: string,
    accountId: string,
    chatbotId: string
  ): Promise<boolean> {
    const result = await this.repo.deleteChatbotById(
      userId,
      accountId,
      chatbotId
    );
    if (!result) {
      throw new Error("Chatbot not Found for this Chatbot Id");
    }
    return true;
  }
}
