import { AutomationDto, updateAutomationDto } from "../dtos/automation.dto.js";
import AutomationRepository from "../repositories/automation.repository.js";
import {
  TApiResponse,
  TPaginatedResponse,
} from "../types/api-response.type.js";
import { RequestContext } from "../types/common.js";
import { ActivityLogService } from "./activityLog.service.js";

export default class AutomationService {
  private repository = new AutomationRepository();
  private activityLogService = new ActivityLogService();

  async getAutomations(accountId: string): Promise<TPaginatedResponse<any>> {
    const automations = await this.repository.findByAccountId(accountId);

    return {
      docs: automations,
    };
  }
  async createAutomation(context: RequestContext, data: AutomationDto) {
    const isAutomationExists = await this.repository.findByName(
      context.accountId,
      data.name,
    );

    if (isAutomationExists) {
      throw new Error("Automation already exists for this trigger");
    }

    const automation = await this.repository.create({
      accountId: context.accountId,
      ...data,
    });

    // Activity Log
    await this.activityLogService.logCreate({
      accountId: String(context.accountId),
      organizationId: String(context.organizationId),

      entityType: "automation",
      entityId: String(automation._id),

      actor: {
        type: "user",
        id: context.userId,
        name: context.userName,
      },

      metadata: {
        automationName: automation?.name,
      },
    });

    return {
      doc: automation,
    };
  }

  async updateAutomation(
    automationId: string,
    context: RequestContext,
    data: updateAutomationDto,
  ) {
    const isAutomationExists = await this.repository.findById(automationId);

    if (!isAutomationExists) {
      throw new Error("Automation not found");
    }

    if (data.name) {
      const isAutomationExists = await this.repository.findByName(
        context.accountId,
        data.name,
      );

      if (isAutomationExists) {
        throw new Error("Automation already exists for this trigger");
      }
    }

    const automation = await this.repository.update(
      context.accountId,
      automationId,
      data,
    );

    // Activity Log
    await this.activityLogService.logUpdate({
      oldDoc: isAutomationExists,
      newDoc: automation,
      accountId: String(context.accountId),
      organizationId: String(context.organizationId),

      entityType: "automation",
      entityId: String(automation?.id),

      actor: {
        type: "user",
        id: context.userId,
        name: context.userName,
      },

      metadata: {
        automationName: automation?.name,
      },
    });

    return {
      doc: automation,
    };
  }

  async deleteAutomation(
    automationId: string,
    context: RequestContext,
  ): Promise<TApiResponse<{ id: string }>> {
    const automation = await this.repository.findById(automationId);

    if (!automation) {
      throw new Error("Automation not found");
    }

    const result = await this.repository.delete(automationId);

    // Activity Log
    await this.activityLogService.logDelete({
      accountId: String(context.accountId),
      organizationId: String(context.organizationId),

      entityType: "automation",
      entityId: String(automation?.id),

      actor: {
        type: "user",
        id: context.userId,
        name: context.userName,
      },

      metadata: {
        automationName: automation?.name,
      },
    });

    return {
      doc: {
        id: String(result?.id),
      },
    };
  }
}
