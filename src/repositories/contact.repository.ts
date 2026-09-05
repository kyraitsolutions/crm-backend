import { ContactModel } from "../models/contact.model.js";
import { TContact, TCreateContact } from "../types/contact.type.js";
import { phoneMatchValues } from "../utils/phone.util.js";

export class ContactRepository {
  async getContacts(criteria: any, skip: number,limit?: number, sort?: Record<string, 1 | -1> ): Promise<any> {
    const query= ContactModel.find(criteria).sort(sort||{createdAt:-1}).limit(limit||10).skip(skip);

    return await query.exec();
  }

  async countDocuments(criteria: any) {
    return await ContactModel.find(criteria).countDocuments();
  }
  
  async findExistingContact(
    accountId: string,
    email?: string | null,
    phone?: string | null
  ) {
    const conditions: Record<string, unknown>[] = [];

    if (email) {
      conditions.push({ email });
    }

    const phones = phoneMatchValues(phone);
    if (phones.length) {
      conditions.push({ phone: { $in: phones } });
    }

    if (!conditions.length) {
      return null;
    }

    return await ContactModel.findOne({
      accountId,
      $or: conditions,
    }).lean();
  }

  async updateContactById(
    contactId: string,
    payload: Record<string, unknown>,
  ): Promise<TContact | null> {
    return (await ContactModel.findByIdAndUpdate(
      contactId,
      { $set: payload },
      { new: true },
    )) as unknown as TContact | null;
  }

  async createContact(payload: TCreateContact): Promise<TContact|{}> {
    return await ContactModel.create(payload);
  }

  async deleteContact(
    accountId: string,
    contactId: string,
  ): Promise<any | null> {
    return await ContactModel.findByIdAndDelete({
      _id: contactId,
      accountId,
    }).lean();
  };
}
