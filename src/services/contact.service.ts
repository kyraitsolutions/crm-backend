import { HttpError } from "../utils/http.error.js";
import { ContactRepository } from "../repositories/contact.repository.js";
import { AccountRepository } from "../repositories/account.repository.js";
import { TContact, TCreateContact } from "../types/contact.type.js";
import {
  normalizeEmail,
  normalizePhone,
  toContactPhone,
} from "../utils/phone.util.js";
import logger from "../utils/logger.js";
import { ActivityLogService } from "./activityLog.service.js";
import { AutomationEngine } from "./automation-engine.service.js";
import { AUTOMATION_TRIGGERS } from "../constants/automation.constant.js";

const isObjectIdString = (value: string) => /^[a-fA-F0-9]{24}$/.test(value);

const resolveAccountId = (value: unknown): string => {
  if (!value) return "";
  if (typeof value === "string") {
    return isObjectIdString(value) ? value : "";
  }
  if (typeof (value as { toHexString?: () => string }).toHexString === "function") {
    const hex = String((value as { toHexString: () => string }).toHexString());
    return isObjectIdString(hex) ? hex : "";
  }
  if (typeof value === "object") {
    const nested =
      (value as { _id?: unknown; id?: unknown })._id ??
      (value as { id?: unknown }).id;
    if (nested && nested !== value) {
      return resolveAccountId(nested);
    }
  }
  return "";
};

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
  private automationEngine = new AutomationEngine();

  constructor(private contactRepository: ContactRepository) {}

  async getContacts(
    accountId: string,
    payload: Record<string, any>,
    skip: number,
    pageLimit?: number,
  ): Promise<any> {
    const { search, dateRange, filters = {}, sort = {} } = payload;
    const limit =
      Number(pageLimit) ||
      Number(payload.rowPerPage) ||
      Number(payload.limit) ||
      10;

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
    const phone = toContactPhone(payload.phone);

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

    try {
      const contactId = String((contact as any)?._id || (contact as any)?.id || "");
      const accountId = String((contact as any)?.accountId || payload.accountId);
      const account = await this.accountRepository.findOne(accountId);
      const organizationId = String((account as any)?.organizationId || "");
      const data =
        typeof (contact as any)?.toJSON === "function"
          ? (contact as any).toJSON()
          : contact;
      await this.automationEngine.process({
        accountId,
        trigger: AUTOMATION_TRIGGERS.CONTACT_CREATED,
        payload: {
          ...data,
          organizationId,
          entityType: "contact",
          entityId: contactId,
          id: contactId,
        },
      });
    } catch (error) {
      logger.warn("Contact created automation failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return contact;
  }

  async updateContact(
    accountId: string,
    contactId: string,
    payload: Partial<TCreateContact>,
  ): Promise<TContact> {
    const existing = await this.contactRepository.findByAccountAndId(
      accountId,
      contactId,
    );
    if (!existing) {
      throw HttpError.notFound("Contact not found");
    }

    const email = normalizeEmail(payload.email);
    const phone = toContactPhone(payload.phone);
    const duplicate = await this.contactRepository.findExistingContact(
      accountId,
      email,
      phone,
      contactId,
    );
    if (duplicate) {
      throw HttpError.conflict(
        "A contact with this email or phone number already exists.",
      );
    }

    const $set: Record<string, unknown> = {
      lastActivity: new Date(),
    };
    if (payload.name != null) $set.name = String(payload.name).trim();
    if (payload.source) $set.source = this.mapSource(payload.source);
    if (payload.status) $set.status = payload.status;
    if (payload.tags !== undefined) {
      const tags = Array.isArray(payload.tags)
        ? payload.tags
        : payload.tags
          ? [payload.tags]
          : [];
      $set.tags = tags.filter(Boolean);
    }
    if (phone) $set.phone = phone;

    const update: Record<string, unknown> = { $set };
    if (email) {
      $set.email = email;
    } else {
      update.$unset = { email: 1 };
    }

    const updated = await this.contactRepository.updateContactByAccount(
      accountId,
      contactId,
      update,
    );
    if (!updated) {
      throw HttpError.notFound("Contact not found");
    }

    try {
      const account = await this.accountRepository.findOne(accountId);
      const organizationId = String((account as any)?.organizationId || "");
      if (organizationId) {
        await this.activityLogService.logUpdate({
          accountId,
          organizationId,
          entityType: "contact",
          entityId: contactId,
          actor: { type: "user", name: "user" },
          oldDoc: existing,
          newDoc: updated,
        });
      }
    } catch (activityError) {
      logger.warn("Contact activity log failed after update", {
        accountId,
        contactId,
        error:
          activityError instanceof Error
            ? activityError.message
            : String(activityError),
      });
    }

    return updated as unknown as TContact;
  }

  async upsertFromLead(lead: ContactIdentityInput): Promise<TContact | null> {
    try {
      return await this.upsertUniqueContact(lead);
    } catch (error) {
      logger.error("Failed to sync contact from lead", {
        accountId: lead.accountId,
        phone: lead.phone || lead.mobile,
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
    const accountId = resolveAccountId(input.accountId);
    const email = normalizeEmail(input.email);
    const source = this.mapSource(input.source);
    const isWhatsApp = source === "whatsapp";
    const phone = toContactPhone(input.phone || input.mobile);
    const name = String(input.name || "").trim();

    if (!accountId || (!email && !phone)) {
      logger.warn("Contact upsert skipped: missing accountId or identity", {
        accountId: String(input.accountId || ""),
        hasEmail: Boolean(email),
        hasPhone: Boolean(normalizePhone(input.phone || input.mobile)),
      });
      return null;
    }

    const existing = await this.contactRepository.findExistingContact(
      accountId,
      email,
      phone || input.phone || input.mobile,
    );

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
      if (phone) {
        const existingDigits = String(existing.phone || "").replace(/\D/g, "");
        const nextDigits = phone.replace(/\D/g, "");
        const sameNumber =
          existingDigits.slice(-10) === nextDigits.slice(-10);
        if (!existingDigits) {
          patch.phone = phone;
        } else if (sameNumber && existing.phone !== phone) {
          if (isWhatsApp || nextDigits.length >= existingDigits.length) {
            patch.phone = phone;
          }
        }
      }
      if (isWhatsApp && !(existing as any).whatsapp?.optIn) {
        patch.whatsapp = {
          optIn: true,
          optedInAt: now,
          source: "whatsapp",
        };
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
    if (isWhatsApp) {
      payload.whatsapp = {
        optIn: true,
        optedInAt: now,
        source: "whatsapp",
      };
    }

    try {
      const created = (await this.contactRepository.createContact(
        payload as TCreateContact,
      )) as TContact;
      try {
        await this.recordContactActivity("create", created, {
          type: "system",
          name: isWhatsApp ? "whatsapp" : "lead-sync",
        });
      } catch (activityError) {
        logger.warn("Contact activity log failed after create", {
          accountId,
          error:
            activityError instanceof Error
              ? activityError.message
              : String(activityError),
        });
      }
      logger.info("Contact created", {
        accountId,
        source,
        phone,
        contactId: String((created as any)?._id || (created as any)?.id || ""),
      });
      return created;
    } catch (error: any) {
      if (error?.code === 11000) {
        const duplicate = await this.contactRepository.findExistingContact(
          accountId,
          email,
          phone || input.phone || input.mobile,
        );
        if (duplicate) {
          return duplicate as unknown as TContact;
        }
        logger.error("Contact create hit duplicate key without a match", {
          accountId,
          phone,
          email,
          keyPattern: error?.keyPattern,
          keyValue: error?.keyValue,
        });
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
