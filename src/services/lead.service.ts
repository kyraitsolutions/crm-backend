import { LeadRespository } from "../repositories/lead.respository.js";
import { Lead, LeadModel } from "../models/lead.model.js";
import { GeminiAIUtil } from "../ai/ai.service.js";
import { safeJsonParse } from "../ai/ai.parsers.js";
import { EmailService } from "./email.service.js";
import { LeadDto } from "../dtos/lead.dto.js";
import { ActivityLogService } from "./activityLog.service.js";
import { AutomationEngine } from "./automation-engine.service.js";
import { TActivityLog } from "../types/activityLog.type.js";
import { AUTOMATION_TRIGGERS } from "../constants/automation.constant.js";
import { RequestContext } from "../types/common.js";
import { leadSummaryPrompt } from "../ai/ai.prompts.js";
import { TApiResponse } from "../types/api-response.type.js";
import { ChunkUtil } from "../utils/chunks.util.js";
import { AccountRepository } from "../repositories/account.repository.js";
import { HttpError } from "../utils/http.error.js";
import logger from "../utils/logger.js";
import { ContactService } from "./contact.service.js";
import { ContactRepository } from "../repositories/contact.repository.js";
import { SubscriptionService } from "./subscription.service.js";
import { USAGE_METRIC } from "../constants/subscription.constant.js";
// import { notificationService } from "../container.js";
import { emitToAccount } from "../config/wsServer/wsEmitter.js";
import { WEBSOCKET_EVENTS } from "../constants/wsEvent.constants.js";
import { asEntityId } from "../utils/request-context.utils.js";

const BATCH_SIZE = 1000;
const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

/** Normalize user-ref / ObjectId values for stable activity + automation compares */
function leadRefId(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    for (const key of ["id", "_id", "userId"] as const) {
      if (obj[key] != null && OBJECT_ID_RE.test(String(obj[key]))) {
        return String(obj[key]);
      }
    }
    if (
      typeof (value as { toHexString?: () => string }).toHexString === "function"
    ) {
      return (value as { toHexString: () => string }).toHexString();
    }
  }
  const str = String(value);
  return OBJECT_ID_RE.test(str) ? str : null;
}

const USER_REF_ACTIVITY_FIELDS = new Set([
  "assignedTo",
  "assignedBy",
  "ownerId",
  "userId",
  "createdBy",
  "updatedBy",
]);

/**
 * Build a minimal before/after snapshot for activity logging —
 * only keys the client actually updated, with refs as plain ids.
 */
function pickLeadActivitySnapshot(
  doc: Record<string, any> | null | undefined,
  keys: string[],
): Record<string, unknown> {
  const snap: Record<string, unknown> = {};
  if (!doc) return snap;

  for (const key of keys) {
    const value = doc[key];
    if (USER_REF_ACTIVITY_FIELDS.has(key)) {
      snap[key] = leadRefId(value);
      continue;
    }
    if (
      value &&
      typeof value === "object" &&
      typeof (value as { toHexString?: () => string }).toHexString === "function"
    ) {
      snap[key] = (value as { toHexString: () => string }).toHexString();
      continue;
    }
    snap[key] = value ?? null;
  }

  return snap;
}

export class LeadService {
  private ai: GeminiAIUtil;
  private emailService: EmailService;
  private leadRepository: LeadRespository;
  private automationEngine = new AutomationEngine();
  private activityLogService = new ActivityLogService();
  private accountRepository: AccountRepository;
  private contactService: ContactService;
  private subscriptionService: SubscriptionService;

  constructor() {
    this.ai = new GeminiAIUtil();
    this.emailService = new EmailService();
    this.leadRepository = new LeadRespository();
    this.automationEngine = new AutomationEngine();
    this.activityLogService = new ActivityLogService();
    this.accountRepository = new AccountRepository();
    this.contactService = new ContactService(new ContactRepository());
    this.subscriptionService = new SubscriptionService();
  }

  private async assertLeadCapacity(organizationId?: string) {
    if (!organizationId) return;
    await this.subscriptionService.checkLimit(
      organizationId,
      USAGE_METRIC.LEADS,
    );
  }

  private async recordLeadUsage(organizationId?: string) {
    if (!organizationId) return;
    await this.subscriptionService.recordUsage(
      organizationId,
      USAGE_METRIC.LEADS,
    );
  }

  private pickLeadIdentity(data: Record<string, any>, keys: string[]): string {
    for (const key of keys) {
      const value = data?.[key];
      if (value == null) continue;
      const text = String(value).trim();
      if (text) return text;
    }
    return "";
  }

  private flattenLeadCustomFields(customFields: unknown): Record<string, any> {
    if (!customFields) return {};
    if (customFields instanceof Map) {
      return Object.fromEntries(customFields);
    }
    if (typeof customFields === "object") {
      return { ...(customFields as Record<string, any>) };
    }
    return {};
  }

  private contactPayloadFromLead(lead: any) {
    const data = typeof lead?.toJSON === "function" ? lead.toJSON() : lead || {};
    const custom = this.flattenLeadCustomFields(data.customFields);
    const merged = { ...custom, ...data };
    const firstName = this.pickLeadIdentity(merged, ["first_name", "firstName"]);
    const lastName = this.pickLeadIdentity(merged, ["last_name", "lastName"]);
    const name =
      this.pickLeadIdentity(merged, ["name", "full_name", "fullName"]) ||
      [firstName, lastName].filter(Boolean).join(" ").trim();

    return {
      accountId: String(data?.accountId || merged?.accountId || ""),
      name,
      email: this.pickLeadIdentity(merged, [
        "email",
        "email_address",
        "emailAddress",
        "work_email",
      ]),
      phone: this.pickLeadIdentity(merged, [
        "phone",
        "mobile",
        "phone_number",
        "phoneNumber",
        "mobile_number",
        "mobileNumber",
        "whatsapp",
        "whatsapp_number",
      ]),
      mobile: this.pickLeadIdentity(merged, ["mobile", "mobileNumber", "phone"]),
      source: data?.source?.name || data?.source,
      tags: Array.isArray(data?.tags) ? data.tags : [],
    };
  }

  private async syncContactFromLead(lead: any, fallback?: any): Promise<void> {
    const payload = this.contactPayloadFromLead({
      ...(fallback || {}),
      ...(typeof lead?.toJSON === "function" ? lead.toJSON() : lead || {}),
      accountId:
        (typeof lead?.toJSON === "function" ? lead.toJSON() : lead)?.accountId ||
        fallback?.accountId,
      source:
        (typeof lead?.toJSON === "function" ? lead.toJSON() : lead)?.source ||
        fallback?.source,
    });

    const contact = await this.contactService.upsertFromLead(payload);
    if (!contact) {
      logger.warn("Lead contact not created", {
        accountId: payload.accountId,
        source: payload.source,
        hasPhone: Boolean(payload.phone),
        hasEmail: Boolean(payload.email),
      });
    }
  }

  async createLeadWs(lead: Lead): Promise<Lead> {
    const account = await this.accountRepository.findOne(String(lead.accountId));
    await this.assertLeadCapacity(account?.organizationId && String(account.organizationId));
    const created = await this.leadRepository.create(lead);
    await this.syncContactFromLead(created, lead);
    await this.recordLeadUsage(account?.organizationId && String(account.organizationId));
    const leadId = String((created as any)?._id || (created as any)?.id || "");
    if (account?.organizationId) {
      await this.activityLogService.logCreate({
        accountId: String(lead.accountId),
        organizationId: String(account.organizationId),
        entityType: "lead",
        entityId: leadId,
        actor: { type: "system", name: "chatbot" },
        metadata: {
          leadName: (created as any)?.name,
          source: (created as any)?.source?.name,
        },
      });
    }

    const createdJson =
      typeof (created as any)?.toJSON === "function"
        ? (created as any).toJSON()
        : created;
    await this.automationEngine.process({
      accountId: String(lead.accountId || (createdJson as any)?.accountId),
      trigger: AUTOMATION_TRIGGERS.LEAD_CREATED,
      payload: {
        ...createdJson,
        organizationId: account?.organizationId,
        entityType: "lead",
        entityId: leadId,
        id: leadId,
      },
    });

    await this.notifyLeadCreated({
      organizationId: asEntityId(account?.organizationId),
      accountId: asEntityId(lead.accountId),
      lead: created,
    });
    return created;
  }
  async createLead(
    context: RequestContext,
    lead: LeadDto,
  ): Promise<TApiResponse<Lead>> {
    logger.info("Creating lead", {
      accountId: context.accountId,
      organizationId: context.organizationId,
    });
    await this.assertLeadCapacity(context.organizationId);
    const result = await this.leadRepository.create(lead);
    await this.syncContactFromLead(result, lead);
    await this.recordLeadUsage(context.organizationId);

    // Activity Log
    const activityLogDataPayload: Partial<TActivityLog> = {
      accountId: String(lead.accountId),
      organizationId: String(context?.organizationId),

      entityType: "lead",
      entityId: String(result._id),

      actor: {
        type: "user",
        id: context.userId,
        name: context.userName,
      },

      metadata: {
        leadName: result?.name,
        source: result?.source?.name,
      },
    };

    await this.activityLogService.logCreate(activityLogDataPayload);

    // Trigger automation
    const automationDataPayload = {
      ...result?.toJSON(),
      organizationId: context?.organizationId,
      entityType: "lead",
      entityId: result._id,
    };

    logger.debug("Lead created, running automations", {
      leadId: String(result._id),
      accountId: result?.accountId,
    });
    await this.automationEngine.process({
      accountId: result?.accountId,
      trigger: AUTOMATION_TRIGGERS.LEAD_CREATED,
      payload: automationDataPayload,
    });

    await this.notifyLeadCreated({
      organizationId: asEntityId(context.organizationId),
      accountId: asEntityId(lead.accountId || result?.accountId),
      lead: result,
    });

    return {
      doc: result,
    };
  }

  private buildBulkOps(
    context: RequestContext,
    leads: LeadDto[],
    uniqueKey: string,
    mode: "upsert" | "insert" | "skip",
  ) {
    return leads.map((lead) => {
      const doc = {
        ...lead,
        accountId: context.accountId,
        organizationId: context.organizationId,
      };

      if (mode === "upsert" && uniqueKey) {
        return {
          updateOne: {
            filter: {
              accountId: context.accountId,
              [uniqueKey]: (lead as any)[uniqueKey],
            },
            update: { $set: doc },
            upsert: true,
          },
        };
      }

      return { insertOne: { document: doc } };
    });
  }

  async createBulkLead(
    context: RequestContext,
    leads: LeadDto[],
    uniqueKey: string,
    mode: any,
  ): Promise<any> {
    
    if (!Array.isArray(leads) || leads.length === 0) {
      throw HttpError.badRequest("leads must be a non-empty array");
    }

    const results = { inserted: 0, updated: 0, failed: 0, errors: [] as any[] };
    const batches = ChunkUtil.chunkArray(leads, BATCH_SIZE);

    logger.info("Bulk lead write started", {
      batches: batches.length,
      uniqueKey,
      mode,
    });
    for (let i = 0; i < batches.length; i++) {
      const ops = this.buildBulkOps(context, batches[i], uniqueKey, mode);
      const offset = i * BATCH_SIZE;

      try {
        const res = await this.leadRepository.bulkWrite(ops);
        results.inserted += res.insertedCount + res.upsertedCount;
        results.updated += res.modifiedCount;
        await this.contactService.upsertManyFromLeads(
          batches[i].map((lead) =>
            this.contactPayloadFromLead({
              ...lead,
              accountId: context.accountId,
            }),
          ),
        );

        // Fire LEAD_CREATED for newly inserted / upserted docs only
        const newIds = [
          ...Object.values((res as any).insertedIds || {}).map(String),
          ...Object.values((res as any).upsertedIds || {}).map((u: any) =>
            String(u?._id || u),
          ),
        ].filter(Boolean);

        for (const id of newIds) {
          try {
            const doc = await LeadModel.findById(id).lean();
            if (!doc) continue;
            await this.automationEngine.process({
              accountId: context.accountId,
              trigger: AUTOMATION_TRIGGERS.LEAD_CREATED,
              payload: {
                ...doc,
                organizationId: context.organizationId,
                entityType: "lead",
                entityId: id,
                id,
              },
            });
          } catch (autoErr) {
            logger.warn("Bulk lead automation failed", {
              leadId: id,
              error:
                autoErr instanceof Error ? autoErr.message : String(autoErr),
            });
          }
        }
      } catch (err: any) {
        const writeErrors = err?.writeErrors || [];
        results.failed += writeErrors.length;
        results.inserted += (err?.result?.insertedCount || 0) + (err?.result?.upsertedCount || 0);
        results.updated += err?.result?.modifiedCount || 0;
        results.errors.push(
          ...writeErrors.map((e: any) => ({
            index: offset + e.index,
            message: e.errmsg,
          })),
        );
      }
    }
    return results;
  }

  async getLeads(_userId: string,accountId: string,payload: Record<string, any>,skip: number): Promise<any | null> {
    if (!accountId) {
      throw HttpError.badRequest("Account id is required");
    }
    const {
      page = 1,
      limit = 10,
      search,
      filters = {},
      assignedTo,
      form,
      dateRange,
      read,
      sort = {},
    } = payload;
    console.log(page, read);
    const criteria: any = {
      // userId,
      accountId,
    };

    // SEARCH===============================================
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
        {
          company: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }
    // FILTERS===================================

    if (filters.stage) {
      criteria.stage = filters.stage;
    }

    if (filters.status) {
      criteria.status = filters.status;
    }

    if (filters.source) {
      criteria["source.name"] = filters.source;
    }

    // assignedTo
    if (assignedTo) {
      criteria.assignedTo = assignedTo;
    }

    // form
    if (form) {
      criteria["source.formId"] = form;
    }

    // tags
    if (filters.tags?.length) {
      criteria.tags = {
        $in: filters.tags,
      };
    }

    // DATE RANGE
    // -------------------------
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

    // SORTING
    // -------------------------
    const sortQuery: any = {};

    if (sort?.field) {
      sortQuery[sort.field] = sort.order === "asc" ? 1 : -1;
    } else {
      sortQuery.createdAt = -1;
    }

    return await Promise.all([
      this.leadRepository.find(criteria, limit, skip, sortQuery),
      this.leadRepository.countDocuments(criteria),
    ]);
    // const leads = await this.leadRepository.find(criteria, paginationOptions);

    // return {
    //   leads:leads||[],
    //   totalDocs: count,
    // };
  }
  async getLead(accountId: string, leadId: string): Promise<any | null> {
    return await this.leadRepository.getLeadById(accountId, leadId);
  }
  async getLeadSummary(accountId: string, leadId: string): Promise<any> {
    const lead = await this.leadRepository.getLeadById(accountId, leadId);

    // For Gemini
    const prompt = leadSummaryPrompt(lead);
    const rawResponse = await this.ai.runGoogleAI({ prompt });

    // For Open AI
    // const prompt = JSON.stringify(lead);
    // const rawResponse = await this.ai.runOpenAI(
    //   prompt,
    //   "one parameter expected here",
    // );
    logger.debug("Lead summary generated", { accountId, leadId });

    if (!rawResponse) {
      return null;
    }
    const result = safeJsonParse(rawResponse);
    return result;
  }

  // async updateLead(
  //   _accountId: string,
  //   leadId: string,
  //   lead: Lead,
  // ): Promise<Lead | null> {
  //   const existingLead = await this.leadRepository.getLeadById(
  //     _accountId,
  //     leadId,
  //   );

  //   if (!existingLead) {
  //     throw HttpError.notFound("Lead not found");
  //   }

  //   const updatedLead = await this.leadRepository.updateLeadById(leadId, lead);

  //   if (existingLead?.stage && existingLead?.stage !== updatedLead?.stage) {
  //     this.AutomationEngine.process({
  //       accountId: _accountId,
  //       trigger: "lead-status-changed",
  //       payload: updatedLead,
  //     });
  //   }

  //   return updatedLead;
  // }

  async updateLead(
    accountId: string,
    leadId: string,
    lead: Lead,
    currentUser: any,
  ): Promise<TApiResponse<Lead | null>> {
    // Lean plain document — do NOT use getLeadById here.
    // That aggregate joins `emails` and replaces `assignedTo` with a profile,
    // which invents fake activity diffs against the plain update result.
    const existingLead = await LeadModel.findOne({
      _id: leadId,
      accountId,
    }).lean();

    if (!existingLead) {
      throw HttpError.notFound("Lead not found");
    }

    const PROTECTED_KEYS = new Set([
      "_id",
      "id",
      "createdAt",
      "updatedAt",
      "accountId",
      "organizationId",
      "__v",
    ]);

    const updateData: Record<string, any> = {};
    const customFields: Record<string, any> = {};

    for (const [key, value] of Object.entries(lead || {})) {
      if (PROTECTED_KEYS.has(key)) continue;

      if (LeadModel.schema.path(key)) {
        updateData[key] = value;
      } else {
        customFields[key] = value;
      }
    }

    if (Object.keys(customFields).length > 0) {
      const previousCustom =
        existingLead.customFields instanceof Map
          ? Object.fromEntries(existingLead.customFields as Map<string, unknown>)
          : ((existingLead.customFields as Record<string, unknown>) || {});
      updateData.customFields = { ...previousCustom, ...customFields };
    }

    if (Object.keys(updateData).length === 0) {
      return { doc: existingLead as unknown as Lead };
    }

    const updatedLead = await this.leadRepository.updateLeadById(
      leadId,
      updateData,
    );
    await this.syncContactFromLead({
      ...existingLead,
      ...updatedLead,
      accountId,
    });

    // Activity: only fields the client actually sent — backend owns the diff.
    const activityKeys = Object.keys(updateData);
    const oldSnap = pickLeadActivitySnapshot(existingLead, activityKeys);
    const newSnap = pickLeadActivitySnapshot(updatedLead, activityKeys);

    await this.activityLogService.logUpdate({
      accountId,
      organizationId: currentUser?.organizationId,

      entityType: "lead",
      entityId: leadId,

      action: "lead.updated",

      actor: {
        type: "user",
        name: currentUser.name,
        id: currentUser.id,
      },

      metadata: {
        leadName: updatedLead?.name ?? existingLead.name,
        source:
          String(
            (updatedLead as any)?.source?.name ??
              (existingLead as any)?.source?.name ??
              "",
          ) || undefined,
      },

      oldDoc: oldSnap,
      newDoc: newSnap,
    });

    const prevStage = existingLead.stage;
    const nextStage = (updatedLead as { stage?: string } | null)?.stage;
    const prevAssigned = leadRefId(existingLead.assignedTo);
    const nextAssigned = leadRefId(
      (updatedLead as { assignedTo?: unknown } | null)?.assignedTo,
    );

    const stageChanged =
      updateData.stage != null && String(prevStage || "") !== String(nextStage || "");
    const assignedChanged =
      updateData.assignedTo != null && prevAssigned !== nextAssigned;

    const automationPayload = {
      ...((updatedLead as any)?.toJSON?.() || updatedLead),
      organizationId: currentUser?.organizationId,
      entityType: "lead",
      entityId: leadId,
      id: leadId,
    };

    if (stageChanged) {
      await this.automationEngine.process({
        accountId,
        trigger: AUTOMATION_TRIGGERS.LEAD_STAGE_CHANGED,
        payload: {
          ...automationPayload,
          previousStage: prevStage,
        },
      });
    }

    if (assignedChanged) {
      await this.automationEngine.process({
        accountId,
        trigger: AUTOMATION_TRIGGERS.LEAD_ASSIGNED,
        payload: {
          ...automationPayload,
          previousAssignedTo: prevAssigned,
        },
      });
    }

    return {
      doc: updatedLead as unknown as Lead,
    };
  }
  async updateLeadWs(lead: Lead): Promise<Lead | null> {
    const leadId = String((lead as any)?.id || (lead as any)?._id || "");
    const accountId = String((lead as any)?.accountId || "");
    const before =
      leadId && accountId
        ? await LeadModel.findOne({ _id: leadId, accountId }).lean()
        : null;

    const updated = await this.leadRepository.update(lead);
    if (updated) {
      await this.syncContactFromLead(updated);

      const orgId =
        (updated as any)?.organizationId ||
        (before as any)?.organizationId ||
        null;
      const account = orgId
        ? null
        : await this.accountRepository.findOne(accountId);
      const organizationId = String(
        orgId || (account as any)?.organizationId || "",
      );

      const payload = {
        ...((updated as any)?.toJSON?.() || updated),
        organizationId,
        entityType: "lead",
        entityId: leadId,
        id: leadId,
      };

      const stageChanged =
        before &&
        (lead as any)?.stage != null &&
        String(before.stage || "") !== String((updated as any).stage || "");
      const assignedChanged =
        before &&
        (lead as any)?.assignedTo != null &&
        String(before.assignedTo || "") !==
          String((updated as any).assignedTo || "");

      if (stageChanged) {
        await this.automationEngine.process({
          accountId,
          trigger: AUTOMATION_TRIGGERS.LEAD_STAGE_CHANGED,
          payload: { ...payload, previousStage: before?.stage },
        });
      }
      if (assignedChanged) {
        await this.automationEngine.process({
          accountId,
          trigger: AUTOMATION_TRIGGERS.LEAD_ASSIGNED,
          payload: {
            ...payload,
            previousAssignedTo: before?.assignedTo
              ? String(before.assignedTo)
              : null,
          },
        });
      }
    }
    return updated;
  }

  private async notifyLeadCreated({
    organizationId,
    accountId,
    lead,
  }: {
    organizationId: string;
    accountId: string;
    lead: any;
  }) {
    try {
      const data = typeof lead?.toJSON === "function" ? lead.toJSON() : lead;
      const leadId = asEntityId(data?.id || data?._id || lead?._id);
      const { staffAlertService } = await import(
        "../modules/notifications/services/staff-alert.service.js"
      );
      await staffAlertService.notifyLeadCreated({
        organizationId: asEntityId(organizationId),
        accountId: asEntityId(accountId),
        leadId,
        name: data?.name,
        phone: data?.phone || data?.mobile,
        email: data?.email,
        source: data?.source?.name || data?.source,
        assigneeId: data?.assignedTo ? String(data.assignedTo) : null,
        leadScore:
          typeof data?.score === "number"
            ? data.score
            : typeof data?.leadScore === "number"
              ? data.leadScore
              : null,
      });
      emitToAccount(asEntityId(accountId), WEBSOCKET_EVENTS["Chatbot Lead Created"], {
        lead: data,
      });
    } catch (error) {
      logger.warn("Failed to emit lead notification", {
        accountId,
        error: (error as Error).message,
      });
    }
  }

  async notifyLeadUpdated(lead: Lead | null): Promise<void> {
    if (!lead?.name || !lead.phone || !lead.email) {
      return;
    }

    const account = await this.accountRepository.findOne(
      String(lead.accountId),
    );

    const leadPayload = {
      ...lead,
      accountName: account?.accountName,
      supportEmail: account?.email,
    };

    logger.info("Queueing lead acknowledgement email", {
      email: leadPayload.email,
      accountId: lead.accountId,
    });

    await this.emailService.queueLeadAcknowledgementEmail(
      leadPayload.email as string,
      leadPayload,
    );
  }
}

//  async updateLead(
//     accountId: string,
//     leadId: string,
//     lead: Partial<Lead>,
//     currentUserId: string,
//   ): Promise<Lead> {
//     const existingLead = await this.leadRepository.getLeadById(
//       accountId,
//       leadId,
//     );

//     if (!existingLead) {
//       throw HttpError.notFound("Lead not found");
//     }

//     const changes = {
//       stageChanged: lead.stage && existingLead.stage !== lead.stage,
//       statusChanged: lead.status && existingLead.status !== lead.status,
//       assigneeChanged:
//         lead.assignment?.assignedTo &&
//         String(existingLead.assignment?.assignedTo) !==
//           String(lead.assignment.assignedTo),
//     };

//     if (changes.assigneeChanged) {
//       lead.assignment = {
//         assignedTo: lead.assignment!.assignedTo,
//         assignedAt: new Date(),
//         assignedBy: currentUserId,
//         assignmentType: "manual",
//       };
//     }

//     const updatedLead = await this.leadRepository.updateLeadById(leadId, lead);

//     // await this.createLeadActivities(existingLead, updatedLead, currentUserId);

//     const triggers = [];

//     if (changes.stageChanged) {
//       triggers.push("lead-stage-changed");
//     }

//     if (changes.statusChanged) {
//       triggers.push("lead-status-changed");
//     }

//     if (changes.assigneeChanged) {
//       triggers.push("lead-assigned");
//     }

//     await Promise.all(
//       triggers.map((trigger) =>
//         this.AutomationEngine.process({
//           accountId,
//           trigger,
//           payload: updatedLead,
//         }),
//       ),
//     );

//     return updatedLead;
//   }
