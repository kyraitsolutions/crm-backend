import { ContactModel } from "../models/contact.model.js";
import { TContact, TCreateContact } from "../types/contact.type.js";

export class ContactRepository {
  async getContacts(accountId: string,paginationOptions?: { limit?: number; skip?: number }): Promise<any> {

    const limit=paginationOptions?.limit||25;
    const skip=paginationOptions?.skip||0;

    const [contacts,totalDocs]=await Promise.all([
      ContactModel.find({accountId}).sort({createdAt:-1}).skip(skip).limit(limit).lean(),
      ContactModel.countDocuments({accountId})
    ]);
    return {
      docs:contacts,
      totalDocs
    }
    // return await ContactModel.find({ accountId})
    //   .sort({ createdAt: -1 })
    //   .lean();
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
