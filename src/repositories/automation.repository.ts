import { Types } from "mongoose";
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
    const automations = await AutomationModel.find({
      accountId: new Types.ObjectId(accountId),
      trigger,
      isActive: true,
    });

    return automations;
  }
}
