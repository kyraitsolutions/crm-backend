import { HttpError } from "../../../../utils/http.error.js";
import { CANNED_MESSAGE_STATUS } from "../constants/canned.constant.js";
import { UpsertWhatsAppCannedMessageDto } from "../dtos/canned.dto.js";
import { WhatsAppCannedMessageModel } from "../models/whatsapp-canned-message.model.js";

export class WhatsAppCannedMessageService {
  async list(
    accountId: string,
    query: { search?: string; status?: string } = {},
  ) {
    const filter: Record<string, unknown> = { accountId };
    if (query.status) filter.status = query.status;
    if (query.search) {
      const search = String(query.search).trim();
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { shortcut: { $regex: search, $options: "i" } },
        { text: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }

    const docs = await WhatsAppCannedMessageModel.find(filter)
      .sort({ favourite: -1, lastUsedAt: -1, usageCount: -1, updatedAt: -1 })
      .lean();

    return docs.map((doc) => this.serialize(doc));
  }

  async create(
    params: {
      organizationId: string;
      accountId: string;
      userId: string;
      userName: string;
    },
    payload: UpsertWhatsAppCannedMessageDto,
  ) {
    await this.assertUniqueShortcut(params.accountId, payload.shortcut);
    const created = await WhatsAppCannedMessageModel.create({
      organizationId: params.organizationId,
      accountId: params.accountId,
      createdBy: params.userId,
      createdByName: params.userName,
      ...payload,
    });
    return this.serialize(created.toJSON());
  }

  async update(
    accountId: string,
    id: string,
    payload: UpsertWhatsAppCannedMessageDto,
  ) {
    await this.assertUniqueShortcut(accountId, payload.shortcut, id);
    const updated = await WhatsAppCannedMessageModel.findOneAndUpdate(
      { _id: id, accountId },
      { $set: payload },
      { new: true },
    );
    if (!updated) throw HttpError.notFound("Canned message not found");
    return this.serialize(updated.toJSON());
  }

  async remove(accountId: string, id: string) {
    const deleted = await WhatsAppCannedMessageModel.findOneAndDelete({
      _id: id,
      accountId,
    });
    if (!deleted) throw HttpError.notFound("Canned message not found");
    return this.serialize(deleted.toJSON());
  }

  async toggleFavourite(accountId: string, id: string) {
    const doc = await WhatsAppCannedMessageModel.findOne({ _id: id, accountId });
    if (!doc) throw HttpError.notFound("Canned message not found");
    doc.favourite = !doc.favourite;
    await doc.save();
    return this.serialize(doc.toJSON());
  }

  async markUsed(accountId: string, id: string) {
    const updated = await WhatsAppCannedMessageModel.findOneAndUpdate(
      { _id: id, accountId, status: CANNED_MESSAGE_STATUS.PUBLISHED },
      { $inc: { usageCount: 1 }, $set: { lastUsedAt: new Date() } },
      { new: true },
    );
    if (!updated) throw HttpError.notFound("Canned message not found");
    return this.serialize(updated.toJSON());
  }

  private async assertUniqueShortcut(
    accountId: string,
    shortcut: string,
    excludeId?: string,
  ) {
    const existing = await WhatsAppCannedMessageModel.findOne({
      accountId,
      shortcut,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    });
    if (existing) {
      throw HttpError.conflict("A canned message with this shortcut already exists");
    }
  }

  private serialize(doc: any) {
    const { _id, __v, ...rest } = doc || {};
    return {
      ...rest,
      id: String(doc?.id || _id),
    };
  }
}

export const whatsappCannedMessageService = new WhatsAppCannedMessageService();
