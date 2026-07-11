import {
  ChatBotListDto,
  ChatbotWithFlowDto,
  CreateChatBotDto,
  ResponseChatBotDto,
} from "../dtos/chat-bot.dto.js";
import { AccountRepository } from "../repositories/account.repository.js";
import { ChatbotRepository } from "../repositories/chat-bot.repository.js";
import {
  TPaginatedResponse,
  TQueryParams,
} from "../types/api-response.type.js";
import { buildPagination } from "../utils/paginationBuilder.js";

export class ChatBotService {
  private repo: ChatbotRepository;
  private accountRepository: AccountRepository;

  constructor() {
    this.repo = new ChatbotRepository();
    this.accountRepository = new AccountRepository();
  }

  async getAllChatBotsByUserId(userId: string): Promise<ChatBotListDto[] | []> {
    const chatbots = await this.repo.findAllByUserId(userId);
    return chatbots?.map((chatbot) => new ChatBotListDto(chatbot)) ?? [];
  }

  async getChatBots(
    accountId: string,
    query: TQueryParams = {},
  ): Promise<TPaginatedResponse<ChatBotListDto[] | []>> {
    const { page, limit, search } = query;

    const queryParms = {
      page,
      limit,
      search,
    };

    let chatbots: any = [];
    const countDocs = await this.repo.countDocumentByAccountId(accountId);
    chatbots = await this.repo.findAllByAccountId(accountId, queryParms);

    const chatbotList =
      chatbots?.map((chatbot: any) => new ChatBotListDto(chatbot)) ?? [];

    return {
      docs: chatbotList,
      pagination: buildPagination({
        page: 1,
        limit: 1,
        totalDocs: countDocs,
        docsCount: chatbots.length,
      }),
    };
  }

  async getChatBotWithFlow(
    accountId: string,
    chatbotId: string,
  ): Promise<ChatbotWithFlowDto | null> {
    const chatbotWithFlow = await this.repo.findChatbotWithFlow(
      accountId,
      chatbotId,
    );
    // return chatbotWithFlow;
    return new ChatbotWithFlowDto(chatbotWithFlow);
  }

  async getChatBotById(
    accountId: string,
    chatbotId: string,
  ): Promise<ResponseChatBotDto | null> {
    const chatbot = await this.repo.findChatbotById(accountId, chatbotId);
    if (!chatbot) {
      throw new Error("Chatbot not Found");
    }
    return new ResponseChatBotDto(chatbot);
  }

  async createChatBot(
    userId: string,
    accountId: string,
    createChatBotDto: CreateChatBotDto,
  ): Promise<ResponseChatBotDto> {
    const isAccountExist = await this.accountRepository.findOne(accountId);

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

  async getChatBotFlowById(accountId: string, chatbotId: string) {
    const isAccountExist = await this.accountRepository.findOne(accountId);

    if (!isAccountExist) {
      throw new Error("Account not found for this account id");
    }

    const chatbotFlow = await this.repo.findChatbotFlowById(
      accountId,
      chatbotId,
    );

    if (!chatbotFlow) {
      throw new Error("Chatbot flow not Found");
    }
    return chatbotFlow;
  }

  async updateChatBot(
    accountId: string,
    chatbotId: string,
    updateDto: CreateChatBotDto,
  ) {
    const result = await this.repo.updateChatbot(
      accountId,
      chatbotId,
      updateDto,
    );
    if (!result) {
      throw new Error("Chatbot not found");
    }
    return result;
  }

  async deleteChatBot(accountId: string, chatbotId: string): Promise<boolean> {
    const result = await this.repo.deleteChatbotById(accountId, chatbotId);
    if (!result) {
      throw new Error("Chatbot not Found for this Chatbot Id");
    }
    return true;
  }
}
