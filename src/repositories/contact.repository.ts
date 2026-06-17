import { ContactModel } from "../models/contact.model.js";
import { TContact, TCreateContact } from "../types/contact.type.js";

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
    const conditions = [];

    if (email) {
      conditions.push({ email });
    }

    if (phone) {
      conditions.push({ phone });
    }

    if (!conditions.length) {
      return null;
    }

    return await ContactModel.findOne({
      accountId,
      $or: conditions,
    });
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
