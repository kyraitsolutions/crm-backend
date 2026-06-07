import { AutomationModel } from "../models/automation.model";

export default class AutomationRepository {
  async create(data: any) {
    return await AutomationModel.create(data);
  }

  async findByName(accountId: string, name: string) {
    return await AutomationModel.findOne({
      accountId,
      name,
      isActive: true,
    }).lean();
  }

  async findByTrigger(accountId: string, trigger: string) {
    return await AutomationModel.find({
      accountId,
      trigger,
      isActive: true,
    }).lean();
  }
}
