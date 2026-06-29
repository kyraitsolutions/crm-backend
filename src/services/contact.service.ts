import { ContactRepository } from "../repositories/contact.repository.js";
import { TContact, TCreateContact } from "../types/contact.type.js";

export class ContactService {
  constructor(private contactRepository: ContactRepository) {}

  async getContacts(
    accountId: string,
    payload: Record<string, any>,
    skip: number,
  ): Promise<any> {
    const { search, limit = 10, dateRange, filters = {}, sort = {} } = payload;

    console.log("Payload", payload);

    const criteria: any = {
      accountId,
    };

    // search
    if (search?.trim()) {
      criteria.$or = [
        {
          name: {
            $regex: search,
            $options: "i",
          },
        },
        {
          email: {
            $regex: search,
            $options: "i",
          },
        },
        {
          phone: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    // FILTERS===================================

    if (filters.status) {
      criteria.status = filters.status;
    }

    if (filters.source) {
      criteria.source = filters.source;
    }

    // tags
    if (filters.tags?.length) {
      criteria.tags = {
        $in: filters.tags,
      };
    }

    // DATE RANGE -------------------------
    if (dateRange?.startDate && dateRange?.endDate) {
      const start = new Date(dateRange.startDate);
      const end = new Date(dateRange.endDate);
      if (
        end.getUTCHours() === 0 &&
        end.getUTCMinutes() === 0 &&
        end.getUTCSeconds() === 0 &&
        end.getUTCMilliseconds() === 0
      ) {
        end.setUTCHours(23, 59, 59, 999);
      }
      criteria.createdAt = {
        $gte: start,
        $lte: end,
      };
    }
    // SORTING -------------------------
    const sortQuery: any = {};

    if (sort?.field) {
      sortQuery[sort.field] = sort.order === "asc" ? 1 : -1;
    } else {
      sortQuery.createdAt = -1;
    }

    return await Promise.all([
      this.contactRepository.getContacts(criteria, skip, limit, sortQuery),
      this.contactRepository.countDocuments(criteria),
    ]);

    // return { contacts, count };
  }
  async createContact(payload: TCreateContact): Promise<TContact | {}> {
    const existingContact = await this.contactRepository.findExistingContact(
      payload.accountId,
      payload.email,
      payload.phone,
    );
    if (existingContact) {
      throw new Error("Contact already exists");
    }

    console.log("Contact payload", payload);
    const contact = await this.contactRepository.createContact(payload);
    return contact;
  }
  async deleteContact(
    accountId: string,
    contactId: string,
  ): Promise<any | null> {
    const result = await this.contactRepository.deleteContact(
      accountId,
      contactId,
    );
    return result;
  }
}
