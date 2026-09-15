import { Types } from "mongoose";
import { RecycleBinType } from "../enums/recyclebin.enum.js";
import { RecyclebinModel } from "../models/recyclebin.model.js";
import { ConversationModel } from "../models/conversations.model.js";
import { ContactModel } from "../models/contact.model.js";
import { HttpError } from "../utils/http.error.js";
import { phoneMatchValues } from "../utils/phone.util.js";

const RETENTION_DAYS = 30;

const addDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

const asObjectId = (value: string) => new Types.ObjectId(value);

export class RecyclebinService {
  async list(accountId: string) {
    await this.purgeExpired(accountId);
    const docs = await RecyclebinModel.find({ accountId })
      .sort({ deletedAt: -1 })
      .lean();
    return docs.map((doc) => this.serialize(doc));
  }

  async restore(accountId: string, ids: string[]) {
    if (!ids.length) throw HttpError.badRequest("Select at least one record");
    const items = await RecyclebinModel.find({
      accountId,
      _id: { $in: ids },
    });

    for (const item of items) {
      if (item.expiresAt && item.expiresAt.getTime() < Date.now()) {
        continue;
      }
      if (item.moduleName === RecycleBinType.CONVERSATION) {
        await this.restoreConversation(accountId, item);
      } else if (item.moduleName === RecycleBinType.CONTACT) {
        await this.restoreContact(accountId, item);
      }
      await item.deleteOne();
    }

    return { restored: items.length };
  }

  async permanentDelete(accountId: string, ids: string[]) {
    if (!ids.length) throw HttpError.badRequest("Select at least one record");
    const items = await RecyclebinModel.find({
      accountId,
      _id: { $in: ids },
    });
    for (const item of items) {
      await this.hardDeleteSnapshot(accountId, item);
      await item.deleteOne();
    }
    return { deleted: items.length };
  }

  async empty(accountId: string) {
    const items = await RecyclebinModel.find({ accountId });
    for (const item of items) {
      await this.hardDeleteSnapshot(accountId, item);
    }
    await RecyclebinModel.deleteMany({ accountId });
    return { deleted: items.length };
  }

  async moveConversationsToBin(params: {
    accountId: string;
    userId: string;
    conversationIds: string[];
    deleteContact?: boolean;
  }) {
    const { accountId, userId, conversationIds, deleteContact } = params;
    if (!conversationIds.length) {
      throw HttpError.badRequest("Select at least one conversation");
    }

    const conversations = await ConversationModel.find({
      accountId,
      _id: { $in: conversationIds },
      isDeleted: { $ne: true },
    });

    if (!conversations.length) {
      throw HttpError.notFound("Conversation not found");
    }

    const expiresAt = addDays(RETENTION_DAYS);
    const movedIds: string[] = [];

    for (const conversation of conversations) {
      const snapshot = conversation.toJSON ? conversation.toJSON() : conversation;
      let contactSnapshot: Record<string, unknown> | null = null;

      if (deleteContact) {
        contactSnapshot = await this.removeLinkedContact(
          accountId,
          userId,
          conversation,
          conversationIds,
        );
      }

      await RecyclebinModel.create({
        originalId: conversation._id,
        accountId,
        moduleName: RecycleBinType.CONVERSATION,
        data: {
          conversation: snapshot,
          contact: contactSnapshot,
          deleteContact: Boolean(contactSnapshot),
        },
        deletedBy: asObjectId(userId),
        deletedAt: new Date(),
        expiresAt,
      });

      const currentMetadata =
        (conversation.metadata as Record<string, unknown> | undefined) || {};
      await ConversationModel.updateOne(
        { _id: conversation._id, accountId },
        {
          $set: {
            isDeleted: true,
            metadata: {
              ...currentMetadata,
              recycleBin: {
                deletedAt: new Date(),
                expiresAt,
                deleteContact: Boolean(contactSnapshot),
              },
            },
          },
        },
      );
      movedIds.push(String(conversation._id));
    }

    return { docs: movedIds, expiresAt };
  }

  private async removeLinkedContact(
    accountId: string,
    userId: string,
    conversation: any,
    deletingConversationIds: string[],
  ) {
    const phone = conversation?.contact?.phoneNumber;
    if (!phone) return null;
    const phones = phoneMatchValues(phone);
    if (!phones.length) return null;

    const contact = await ContactModel.findOne({
      accountId,
      phone: { $in: phones },
    });
    if (!contact) return null;

    const otherOpen = await ConversationModel.countDocuments({
      accountId,
      isDeleted: { $ne: true },
      _id: { $nin: deletingConversationIds },
      "contact.phoneNumber": { $in: phones },
    });
    if (otherOpen > 0) return null;

    const snapshot = contact.toJSON ? contact.toJSON() : contact;
    await RecyclebinModel.create({
      originalId: contact._id,
      accountId,
      moduleName: RecycleBinType.CONTACT,
      data: { contact: snapshot },
      deletedBy: asObjectId(userId),
      deletedAt: new Date(),
      expiresAt: addDays(RETENTION_DAYS),
    });
    await ContactModel.deleteOne({ _id: contact._id, accountId });
    return snapshot;
  }

  private async restoreConversation(accountId: string, item: any) {
    const conversationId = item.originalId;
    const existing = await ConversationModel.findOne({
      _id: conversationId,
      accountId,
    });
    if (existing) {
      const currentMetadata =
        (existing.metadata as Record<string, unknown> | undefined) || {};
      await ConversationModel.updateOne(
        { _id: conversationId, accountId },
        {
          $set: {
            isDeleted: false,
            metadata: {
              ...currentMetadata,
              recycleBin: null,
            },
          },
        },
      );
    } else if (item.data?.conversation) {
      const payload = { ...item.data.conversation };
      delete payload.id;
      await ConversationModel.create({
        ...payload,
        _id: conversationId,
        accountId,
        isDeleted: false,
      });
    }

    if (item.data?.contact) {
      await this.restoreContact(accountId, {
        data: { contact: item.data.contact },
        originalId: item.data.contact.id || item.data.contact._id,
      });
    }
  }

  private async restoreContact(accountId: string, item: any) {
    const contact = item.data?.contact;
    if (!contact) return;
    const originalId = item.originalId || contact.id || contact._id;
    const existing = originalId
      ? await ContactModel.findOne({ _id: originalId, accountId })
      : await ContactModel.findOne({
          accountId,
          phone: contact.phone,
        });
    if (existing) return;
    const payload = { ...contact };
    delete payload.id;
    await ContactModel.create({
      ...payload,
      _id: originalId,
      accountId,
    });
  }

  private async hardDeleteSnapshot(accountId: string, item: any) {
    if (item.moduleName === RecycleBinType.CONVERSATION) {
      await ConversationModel.deleteOne({
        _id: item.originalId,
        accountId,
      });
      if (item.data?.contact?._id || item.data?.contact?.id) {
        await ContactModel.deleteOne({
          _id: item.data.contact._id || item.data.contact.id,
          accountId,
        });
      }
    }
    if (item.moduleName === RecycleBinType.CONTACT) {
      await ContactModel.deleteOne({
        _id: item.originalId,
        accountId,
      });
    }
  }

  private async purgeExpired(accountId: string) {
    const expired = await RecyclebinModel.find({
      accountId,
      expiresAt: { $lte: new Date() },
    });
    for (const item of expired) {
      await this.hardDeleteSnapshot(accountId, item);
      await item.deleteOne();
    }
  }

  private serialize(doc: any) {
    const data = doc.data || {};
    const conversation = data.conversation || {};
    const contact = data.contact || {};
    return {
      id: String(doc._id),
      originalId: String(doc.originalId),
      moduleName: doc.moduleName,
      name:
        conversation?.contact?.name ||
        conversation?.contact?.phoneNumber ||
        contact?.name ||
        contact?.phone ||
        "Deleted record",
      type: doc.moduleName,
      deletedAt: doc.deletedAt,
      expiresAt: doc.expiresAt,
      deletedBy: doc.deletedBy,
    };
  }
}
