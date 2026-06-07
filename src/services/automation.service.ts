import { AutomationDto } from "../dtos/automation.dto";
import AutomationRepository from "../repositories/automation.repository";

export default class AutomationService {
  private repository = new AutomationRepository();
  async createAutomation(accountId: string, data: AutomationDto) {
    const isAutomationExists = await this.repository.findByName(
      accountId,
      data.name,
    );

    if (isAutomationExists) {
      throw new Error("Automation already exists for this trigger");
    }

    return this.repository.create({
      accountId,
      ...data,
    });
  }
}
