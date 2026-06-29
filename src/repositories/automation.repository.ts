import { Types } from "mongoose";
import { AutomationModel } from "../models/automation.model.js";

export default class AutomationRepository {
  async findById(id: string): Promise<any> {
    const automation = await AutomationModel.findById(id);
    return automation?.toJSON();
  }
  async findByAccountId(accountId: string) {
    const automations = await AutomationModel.find({ accountId });
    return automations.map((a) => a.toJSON());
  }

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

  async update(accountId: string, id: string, data: any): Promise<any> {
    const automation = await AutomationModel.findOneAndUpdate(
      { accountId, _id: id },
      data,
      {
        new: true,
      },
    );

    return automation?.toJSON();
  }

  async delete(id: string): Promise<any> {
    const automation = await AutomationModel.findByIdAndDelete(id);
    return automation?.toJSON();
  }
}
