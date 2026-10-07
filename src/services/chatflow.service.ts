import { HttpError } from "../utils/http.error.js";
import {
  CreateChatFlowDto,
  ResponseChatFlowDto,
} from "../dtos/chatflow.dto.js";
import { AccountRepository } from "../repositories/account.repository.js";
import { ChatFlowRepository } from "../repositories/chatflow.repository.js";
import { TQueryParams } from "../types/api-response.type.js";
import { buildPagination } from "../utils/paginationBuilder.js";
import { ActivityLogService } from "./activityLog.service.js";
import { correctEmptyBranches } from "../modules/whatsapp/chatflow/utils/chatflow-generate.util.js";

export class ChatFlowService {
  private activityLogService = new ActivityLogService();

  constructor(
    private chatflowRepo: ChatFlowRepository,
    private accountRepository: AccountRepository,
  ) {}

  private normalizeGraph<T extends { nodes?: unknown; edges?: unknown }>(payload: T): T {
    if (!Array.isArray(payload.nodes) || !Array.isArray(payload.edges)) {
      return payload;
    }
    correctEmptyBranches(
      payload.nodes as Array<Record<string, any>>,
      payload.edges as Array<Record<string, any>>,
    );
    return payload;
  }

  async createChatFlow(
    accountId: string,
    createChatBotFlowDto: Partial<CreateChatFlowDto>,
  ) {
    const isAccountExist = await this.accountRepository.findOne(accountId);

    if (!isAccountExist) {
      throw HttpError.notFound("Account not found for this account id");
    }

    const chatFlowPayload = this.normalizeGraph({
      ...createChatBotFlowDto,
      accountId: String(accountId),
    });

    const chatFlow = await this.chatflowRepo.createChatFlow(chatFlowPayload);

    if (!chatFlow) {
      throw HttpError.notFound("Chat flow not Found");
    }

    await this.activityLogService.logCreate({
      accountId,
      organizationId: String((isAccountExist as any)?.organizationId || ""),
      entityType: "chatflow",
      entityId: String((chatFlow as any)?._id || (chatFlow as any)?.id),
      actor: this.activityLogService.userActor({
        id: String((createChatBotFlowDto as any)?.createdBy || ""),
      }),
      metadata: { name: (chatFlow as any)?.name },
    });

    return new ResponseChatFlowDto(chatFlow);
  }

  async getAllChatFlowByAccountId(accountId: string, query: TQueryParams = {}) {
    const isAccountExist = await this.accountRepository.findOne(accountId);

    if (!isAccountExist) {
      throw HttpError.notFound("Account not found for this account id");
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
      throw HttpError.notFound("Account not found for this account id");
    }

    const chatbotFlow = await this.chatflowRepo.findChatFlowById(
      accountId,
      chatflowId,
    );

    if (!chatbotFlow) {
      throw HttpError.notFound("Chat flow not Found");
    }

    return chatbotFlow;
  }

  async updateChatFlow(chatflowId: string, chatbotFlowPayload: any) {
    const payload = this.normalizeGraph({ ...chatbotFlowPayload });
    const updated = await this.chatflowRepo.updateChatFlow(
      chatflowId,
      payload,
    );
    const accountId = String((updated as any)?.accountId || chatbotFlowPayload?.accountId || "");
    const account = accountId
      ? await this.accountRepository.findOne(accountId)
      : null;
    await this.activityLogService.logUpdate({
      oldDoc: {},
      newDoc: updated,
      accountId,
      organizationId: String((account as any)?.organizationId || ""),
      entityType: "chatflow",
      entityId: chatflowId,
      actor: { type: "user", name: "" },
      metadata: { name: (updated as any)?.name },
    });
    return updated;
  }

  async deleteChatFlow(chatflowId: string) {
    const deleted = await this.chatflowRepo.deleteChatFlow(chatflowId);
    const accountId = String((deleted as any)?.accountId || "");
    const account = accountId
      ? await this.accountRepository.findOne(accountId)
      : null;
    await this.activityLogService.logDelete({
      accountId,
      organizationId: String((account as any)?.organizationId || ""),
      entityType: "chatflow",
      entityId: chatflowId,
      actor: { type: "user", name: "" },
      metadata: { name: (deleted as any)?.name },
      deletedData: deleted,
    });
    return deleted;
  }
}
