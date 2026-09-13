import { HttpError } from "../utils/http.error.js";
import { SubscriptionService } from "./subscription.service.js";
import { USAGE_METRIC } from "../constants/subscription.constant.js";
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
import { ActivityLogService } from "./activityLog.service.js";

export class ChatBotService {
  private repo: ChatbotRepository;
  private accountRepository: AccountRepository;
  private activityLogService = new ActivityLogService();

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
      throw HttpError.notFound("Chatbot not Found");
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
      throw HttpError.notFound("Account not found for this account id");
    }

    const organizationId = String((isAccountExist as any).organizationId || "");
    if (organizationId) {
      await new SubscriptionService().checkLimit(
        organizationId,
        USAGE_METRIC.CHATBOTS,
      );
    }

    const chatbot = await this.repo.createChatbot({
      ...createChatBotDto,
      userId,
      accountId: accountId,
    });

    await this.activityLogService.logCreate({
      accountId,
      organizationId,
      entityType: "chatbot",
      entityId: String((chatbot as any)?._id || (chatbot as any)?.id),
      actor: this.activityLogService.userActor({ id: userId }),
      metadata: { name: (chatbot as any)?.name },
    });

    return new ResponseChatBotDto(chatbot);
  }

  async getChatBotFlowById(accountId: string, chatbotId: string) {
    const isAccountExist = await this.accountRepository.findOne(accountId);

    if (!isAccountExist) {
      throw HttpError.notFound("Account not found for this account id");
    }

    const chatbotFlow = await this.repo.findChatbotFlowById(
      accountId,
      chatbotId,
    );

    if (!chatbotFlow) {
      throw HttpError.notFound("Chatbot flow not Found");
    }
    return chatbotFlow;
  }

  async updateChatBot(
    accountId: string,
    chatbotId: string,
    updateDto: CreateChatBotDto,
  ) {
    const existing = await this.repo.findChatbotById(accountId, chatbotId);
    const result = await this.repo.updateChatbot(
      accountId,
      chatbotId,
      updateDto,
    );
    if (!result) {
      throw HttpError.notFound("Chatbot not found");
    }
    const account = await this.accountRepository.findOne(accountId);
    await this.activityLogService.logUpdate({
      oldDoc: existing,
      newDoc: result,
      accountId,
      organizationId: String((account as any)?.organizationId || ""),
      entityType: "chatbot",
      entityId: chatbotId,
      actor: { type: "user", name: "" },
      metadata: { name: (result as any)?.name },
    });
    return result;
  }

  async deleteChatBot(accountId: string, chatbotId: string): Promise<boolean> {
    const existing = await this.repo.findChatbotById(accountId, chatbotId);
    const result = await this.repo.deleteChatbotById(accountId, chatbotId);
    if (!result) {
      throw HttpError.notFound("Chatbot not Found for this Chatbot Id");
    }
    const account = await this.accountRepository.findOne(accountId);
    await this.activityLogService.logDelete({
      accountId,
      organizationId: String((account as any)?.organizationId || ""),
      entityType: "chatbot",
      entityId: chatbotId,
      actor: { type: "user", name: "" },
      metadata: { name: (existing as any)?.name },
      deletedData: existing,
    });
    return true;
  }
}
