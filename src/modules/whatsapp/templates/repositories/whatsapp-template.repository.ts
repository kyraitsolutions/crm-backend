import { FilterQuery } from "mongoose";
import { WhatsappTemplateModel } from "../models/whatsapp-template.model.js";
import { TTemplateQuery } from "../../../../types/api-response.type.js";
import { TTemplate } from "../types/template.types.js";

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
    accountId: string,
    query: TTemplateQuery,
  ): Promise<{
    docs: TTemplate[] | [];
    total: number;
    page: number;
  }> {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;
    const filter: FilterQuery<any> = { accountId };

    if (query?.search) filter.name = { $regex: query.search, $options: "i" };
    if (query?.filters?.category)
      filter.category = { $regex: query.filters.category, $options: "i" };
    if (query.filters?.status)
      filter.status = { $regex: query.filters.status, $options: "i" };

    const [docs, total] = await Promise.all([
      WhatsappTemplateModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      WhatsappTemplateModel.countDocuments(),
    ]);

    if (!docs) return { docs: [], total: 0, page: 0 };

    return {
      docs: docs.map((doc) => doc.toJSON()),
      total,
      page,
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
