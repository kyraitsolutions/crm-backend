import { FilterQuery } from "mongoose";
import { WhatsappTemplateModel } from "../models/whatsapp-template.model.js";

export class WhatsappTemplateRepository {
  async create(data: any) {
    return await WhatsappTemplateModel.create(data);
  }

  async findById(id: string) {
    return await WhatsappTemplateModel.findById(id);
  }

  async findByMetaTemplateId(metaTemplateId: string) {
    return await WhatsappTemplateModel.findOne({
      metaTemplateId,
    });
  }

  async findByName(accountId: string, name: string) {
    return await WhatsappTemplateModel.findOne({
      accountId,
      name,
    });
  }

  async findAll(
    filter: FilterQuery<any>,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      WhatsappTemplateModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      WhatsappTemplateModel.countDocuments(filter),
    ]);

    return {
      docs,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async update(id: string, data: any) {
    return await WhatsappTemplateModel.findByIdAndUpdate(id, data, {
      new: true,
    });
  }

  async delete(id: string) {
    return await WhatsappTemplateModel.findByIdAndDelete(id);
  }
}
