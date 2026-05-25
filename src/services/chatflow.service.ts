import {
  CreateChatFlowDto,
  ResponseChatFlowDto,
} from "../dtos/chatflow.dto.js";
import { AccountRepository } from "../repositories/account.repository.js";
import { ChatFlowRepository } from "../repositories/chatflow.repository.js";
import { TQueryParams } from "../types/api-response.type.js";
import { buildPagination } from "../utils/paginationBuilder.js";

export class ChatFlowService {
  constructor(
    private chatflowRepo: ChatFlowRepository,
    private accountRepository: AccountRepository,
  ) {}

  async createChatFlow(
    accountId: string,
    createChatBotFlowDto: Partial<CreateChatFlowDto>,
  ) {
    const isAccountExist = await this.accountRepository.findOne(accountId);

    if (!isAccountExist) {
      throw new Error("Account not found for this account id");
    }

    const chatFlowPayload = {
      ...createChatBotFlowDto,
      accountId: String(accountId),
    };

    const chatFlow = await this.chatflowRepo.createChatFlow(chatFlowPayload);

    if (!chatFlow) {
      throw new Error("Chat flow not Found");
    }

    return new ResponseChatFlowDto(chatFlow);
  }

  async getAllChatFlowByAccountId(accountId: string, query: TQueryParams = {}) {
    const isAccountExist = await this.accountRepository.findOne(accountId);

    if (!isAccountExist) {
      throw new Error("Account not found for this account id");
    }

    const countDocument = await this.chatflowRepo.countDocument(accountId);
    const chatflows = await this.chatflowRepo.findChatFlowByAccountId(
      accountId,
      query,
    );

    return {
      docs: chatflows,
      pagination: buildPagination({
        page: 1,
        limit: query.limit,
        totalDocs: countDocument,
        docsCount: chatflows.length,
      }),
    };
  }

  async getChatFlowById(accountId: string, chatflowId: string) {
    const isAccountExist = await this.accountRepository.findOne(accountId);

    if (!isAccountExist) {
      throw new Error("Account not found for this account id");
    }

    const chatbotFlow = await this.chatflowRepo.findChatFlowById(
      accountId,
      chatflowId,
    );

    if (!chatbotFlow) {
      throw new Error("Chat flow not Found");
    }

    return chatbotFlow;
  }

  async updateChatFlow(chatflowId: string, chatbotFlowPayload: any) {
    return this.chatflowRepo.updateChatFlow(chatflowId, chatbotFlowPayload);
  }

  async deleteChatFlow(chatflowId: string) {
    return this.chatflowRepo.deleteChatFlow(chatflowId);
  }
}
