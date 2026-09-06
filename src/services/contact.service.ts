import { HttpError } from "../utils/http.error.js";
import { ContactRepository } from "../repositories/contact.repository.js";
import { AccountRepository } from "../repositories/account.repository.js";
import { TContact, TCreateContact } from "../types/contact.type.js";
import { normalizeEmail, normalizePhone } from "../utils/phone.util.js";
import logger from "../utils/logger.js";
import { ActivityLogService } from "./activityLog.service.js";

const CONTACT_SOURCES = [
  "chatbot",
  "website",
  "webform",
  "google_ads",
  "manual",
  "import",
  "instagram",
  "whatsapp",
  "facebook",
  "webhook",
] as const;

type ContactSource = (typeof CONTACT_SOURCES)[number];

export type ContactIdentityInput = {
  accountId?: string;
  name?: string;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  source?: string;
  tags?: string[];
};

export class ContactService {
  private activityLogService = new ActivityLogService();
  private accountRepository = new AccountRepository();

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
    const email = normalizeEmail(payload.email);
    const phone = normalizePhone(payload.phone);

    const existingContact = await this.contactRepository.findExistingContact(
      payload.accountId,
      email,
      phone,
    );
    if (existingContact) {
      throw HttpError.conflict(
        "A contact with this email or phone number already exists.",
      );
    }

    const contactPayload: Record<string, unknown> = {
      ...payload,
    };
    if (email) {
      contactPayload.email = email;
    } else {
      delete contactPayload.email;
    }
    if (phone) {
      contactPayload.phone = phone;
    } else {
      delete contactPayload.phone;
    }

    const contact = await this.contactRepository.createContact(
      contactPayload as TCreateContact,
    );
    await this.recordContactActivity("create", contact);
    return contact;
  }

  async upsertFromLead(lead: ContactIdentityInput): Promise<TContact | null> {
    try {
      return await this.upsertUniqueContact(lead);
    } catch (error) {
      logger.error("Failed to sync contact from lead", {
        accountId: lead.accountId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  async upsertManyFromLeads(leads: ContactIdentityInput[]): Promise<void> {
    const seen = new Set<string>();

    for (const lead of leads) {
      const email = normalizeEmail(lead.email);
      const phone = normalizePhone(lead.phone || lead.mobile);
      const key = `${lead.accountId}:${email || ""}:${phone || ""}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      await this.upsertFromLead(lead);
    }
  }

  private mapSource(source?: string): ContactSource {
    if (source && CONTACT_SOURCES.includes(source as ContactSource)) {
      return source as ContactSource;
    }
    if (source === "webhook") {
      return "webhook";
    }
    return "manual";
  }

  private async upsertUniqueContact(
    input: ContactIdentityInput,
  ): Promise<TContact | null> {
    const accountId = String(input.accountId || "");
    const email = normalizeEmail(input.email);
    const phone = normalizePhone(input.phone || input.mobile);
    const name = String(input.name || "").trim();

    if (!accountId || (!email && !phone)) {
      return null;
    }

    const existing = await this.contactRepository.findExistingContact(
      accountId,
      email,
      phone,
    );

    const source = this.mapSource(input.source);
    const now = new Date();

    if (existing) {
      const patch: Record<string, unknown> = {
        lastActivity: now,
      };

      if (name && !existing.name) {
        patch.name = name;
      }
      if (email && !existing.email) {
        patch.email = email;
      }
      if (phone && (!existing.phone || existing.phone.length < phone.length)) {
        patch.phone = phone;
      }

      const updated = await this.contactRepository.updateContactById(
        String((existing as any)._id || (existing as any).id),
        patch,
      );
      return updated;
    }

    const payload: Record<string, unknown> = {
      accountId,
      name: name || phone || email,
      status: "subscribed",
      source,
      tags: input.tags || [],
      lastActivity: now,
      consent: {
        marketing: true,
        source,
        timestamp: now,
      },
    };

    if (email) {
      payload.email = email;
    }
    if (phone) {
      payload.phone = phone;
    }

    try {
      const created = (await this.contactRepository.createContact(
        payload as TCreateContact,
      )) as TContact;
      await this.recordContactActivity("create", created, {
        type: "system",
        name: "lead-sync",
      });
      return created;
    } catch (error: any) {
      if (error?.code === 11000) {
        const duplicate = await this.contactRepository.findExistingContact(
          accountId,
          email,
          phone,
        );
        return duplicate as unknown as TContact;
      }
      throw error;
    }
  }

  async deleteContact(
    accountId: string,
    contactId: string,
  ): Promise<any | null> {
    const result = await this.contactRepository.deleteContact(
      accountId,
      contactId,
    );
    await this.recordContactActivity("delete", result || { id: contactId, accountId });
    return result;
  }

  private async recordContactActivity(
    op: "create" | "delete",
    contact: any,
    actor?: { type: "user" | "system"; id?: string; name?: string },
  ) {
    const contactId = String(contact?._id || contact?.id || "");
    const accountId = String(contact?.accountId || "");
    if (!contactId || !accountId) return;
    const account = await this.accountRepository.findOne(accountId);
    const organizationId = String((account as any)?.organizationId || "");
    if (!organizationId) return;
    const payload = {
      accountId,
      organizationId,
      entityType: "contact",
      entityId: contactId,
      actor: actor || { type: "system" as const, name: "system" },
      metadata: {
        name: contact?.name,
        email: contact?.email,
        phone: contact?.phone,
      },
    };
    if (op === "create") {
      await this.activityLogService.logCreate(payload);
      return;
    }
    await this.activityLogService.logDelete({
      ...payload,
      deletedData: {
        name: contact?.name,
        email: contact?.email,
        phone: contact?.phone,
      },
    });
  }
}
