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

  async findByName(accountId: string, name: string, excludeId?: string) {
    const query: Record<string, unknown> = {
      accountId,
      name: String(name).trim(),
    };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    return await AutomationModel.findOne(query).lean();
  }

  async findByTrigger(accountId: string, trigger: string) {
    const normalized = String(trigger || "")
      .trim()
      .replace(/[-\s]+/g, "_")
      .toUpperCase();

    // Support legacy LEAD_STATUS_CHANGED records when firing stage changes
    const triggers =
      normalized === "LEAD_STAGE_CHANGED"
        ? ["LEAD_STAGE_CHANGED", "LEAD_STATUS_CHANGED"]
        : [normalized];

    return await AutomationModel.find({
      accountId: new Types.ObjectId(accountId),
      trigger: { $in: triggers },
      isActive: true,
      status: "published",
    });
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
