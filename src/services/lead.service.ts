import { LeadRespository } from "../repositories/lead.respository.js";
import { Lead, LeadModel } from "../models/lead.model.js";
// import { leadSummaryPrompt } from "../ai/ai.prompts.js";
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

export class LeadService {
  private ai: GeminiAIUtil;
  private emailService: EmailService;
  private leadRepository: LeadRespository;
  private automationEngine = new AutomationEngine();
  private activityLogService = new ActivityLogService();

  constructor() {
    this.ai = new GeminiAIUtil();
    this.emailService = new EmailService();
    this.leadRepository = new LeadRespository();
    this.automationEngine = new AutomationEngine();
    this.activityLogService = new ActivityLogService();
  }

  /**
   * Get leads for an account, verifying both userId and accountId.
   * Only fetch leads where userId and accountId match.
   * Further query filters (search, sort, pagination, etc) can be added to this method if needed.
   *
   * @param userId - The user's ID (from authentication context)
   * @param accountId - The account's ID (from req.params)
   * @returns Promise<Lead[]>
   */
  async getLeads(_userId: string, accountId: string, payload: Record<string, any>, skip: number): Promise<any | null> {
    if (!accountId) {
      return null;
    }
    const { page = 1, limit = 10, search, filters = {}, assignedTo, form, dateRange, read, sort = {}, } = payload;

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
      if (end.getUTCHours() === 0 && end.getUTCMinutes() === 0 && end.getUTCSeconds() === 0 && end.getUTCMilliseconds() === 0) {
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

    console.log(sort);
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
  async createLeadWs(lead: Lead): Promise<Lead> {
    return await this.leadRepository.create(lead);
  }
  async createLead(context: RequestContext, lead: LeadDto): Promise<Lead> {
    const result = await this.leadRepository.create(lead);

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

    await this.automationEngine.process({
      accountId: result?.accountId,
      trigger: AUTOMATION_TRIGGERS.LEAD_CREATED,
      payload: automationDataPayload,
    });

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
  //     throw new Error("Lead not found");
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
  ): Promise<Lead | null> {
    const existingLead = await this.leadRepository.getLeadById(
      accountId,
      leadId,
    );

    if (!existingLead) {
      throw new Error("Lead not found");
    }

    const updateData: Record<string, any> = {};
    const customFields: Record<string, any> = {};

    const schemaPaths = Object.keys(LeadModel.schema.paths);

    for (const [key, value] of Object.entries(lead)) {
      // protected fields
      if (["_id", "id", "createdAt", "updatedAt"].includes(key)) {
        continue;
      }

      // schema field exists
      if (LeadModel.schema.path(key)) {
        updateData[key] = value;
      } else {
        customFields[key] = value;
      }
    }

    const updatedLead = await this.leadRepository.updateLeadById(leadId, lead);

    await this.activityLogService.logUpdate({
      accountId: accountId,
      organizationId: currentUser?.organizationId,

      entityType: "lead",
      entityId: leadId,

      action: "lead.updated",

      actor: {
        type: "user",
        id: currentUser.id,
      },

      metadata: {
        leadName: updatedLead?.name,
      },

      oldDoc: existingLead,
      newDoc: updatedLead,
    });

    return updatedLead;
  }
  async updateLeadWs(lead: Lead): Promise<Lead | null> {
    return await this.leadRepository.update(lead);
  }
  async getLead(accountId: string, leadId: string): Promise<any | null> {
    return await this.leadRepository.getLeadById(accountId, leadId);
  }
  async getLeadSummary(accountId: string, leadId: string): Promise<any> {
    const lead = await this.leadRepository.getLeadById(accountId, leadId);

    // For Gemini
    const prompt=leadSummaryPrompt(lead);
    const rawResponse = await this.ai.runGoogleAI({ prompt });

    // For Open AI
    // const prompt = JSON.stringify(lead);
    // const rawResponse = await this.ai.runOpenAI(
    //   prompt,
    //   "one parameter expected here",
    // );
    console.log(rawResponse);

    if (!rawResponse) {
      return null;
    }
    const result = safeJsonParse(rawResponse);
    return result;
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
//       throw new Error("Lead not found");
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
