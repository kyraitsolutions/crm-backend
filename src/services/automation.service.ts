import { AutomationDto } from "../dtos/automation.dto";
import AutomationRepository from "../repositories/automation.repository";
import { RequestContext } from "../types/common";
import { ActivityLogService } from "./activityLog.service";

export default class AutomationService {
  private repository = new AutomationRepository();
  private activityLogService = new ActivityLogService();
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
    });

    return {
      doc: automation,
    };
  }
}
