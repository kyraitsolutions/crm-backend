import { LeadRespository } from "../repositories/lead.respository.js";
import { Lead } from "../models/lead.model.js";
// import { leadSummaryPrompt } from "../ai/ai.prompts.js";
import { GeminiAIUtil } from "../ai/ai.service.js";
import { safeJsonParse } from "../ai/ai.parsers.js";
import { EmailService } from "./email.service.js";
import { AutomationEngine } from "./automation-engine.service.js";

export class LeadService {
  private leadRepository: LeadRespository;
  private emailService: EmailService;
  private AutomationEngine = new AutomationEngine();
  private ai: GeminiAIUtil;

  constructor() {
    this.leadRepository = new LeadRespository();
    this.emailService = new EmailService();
    this.ai = new GeminiAIUtil();
    this.AutomationEngine = new AutomationEngine();
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
  async getLeads(
    _userId: string,
    accountId: string,
    payload: Record<string, any>,
    skip: number,
    // queryFilters?: any, // Define/expand as needed
    // paginationOptions?: { limit?: number; skip?: number },
  ): Promise<any | null> {
    // Only fetch leads that belong to the user and account
    // Add additional filters if provided
    if (!accountId) {
      return null;
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
      criteria.createdAt = {
        $gte: new Date(dateRange.startDate),

        $lte: new Date(dateRange.endDate),
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
  async createLead(lead: Lead): Promise<Lead> {
    const result = await this.leadRepository.create(lead);

    this.emailService.queueWelcomeEmail(
      "abhijeetsingh5631@gmail.com",
      "https://www.google.com",
    );
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
    lead: Partial<Lead>,
    currentUserId: string,
  ): Promise<Lead> {
    const existingLead = await this.leadRepository.getLeadById(
      accountId,
      leadId,
    );

    if (!existingLead) {
      throw new Error("Lead not found");
    }

    const changes = {
      stageChanged: lead.stage && existingLead.stage !== lead.stage,
      statusChanged: lead.status && existingLead.status !== lead.status,
      assigneeChanged:
        lead.assignment?.assignedTo &&
        String(existingLead.assignment?.assignedTo) !==
          String(lead.assignment.assignedTo),
    };

    if (changes.assigneeChanged) {
      lead.assignment = {
        assignedTo: lead.assignment!.assignedTo,
        assignedAt: new Date(),
        assignedBy: currentUserId,
        assignmentType: "manual",
      };
    }

    const updatedLead = await this.leadRepository.updateLeadById(leadId, lead);

    // await this.createLeadActivities(existingLead, updatedLead, currentUserId);

    const triggers = [];

    if (changes.stageChanged) {
      triggers.push("lead-stage-changed");
    }

    if (changes.statusChanged) {
      triggers.push("lead-status-changed");
    }

    if (changes.assigneeChanged) {
      triggers.push("lead-assigned");
    }

    await Promise.all(
      triggers.map((trigger) =>
        this.AutomationEngine.process({
          accountId,
          trigger,
          payload: updatedLead,
        }),
      ),
    );

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
    // const prompt=leadSummaryPrompt(lead);
    // const rawResponse = await this.ai.runGoogleAI({ prompt });

    // For Open AI
    const prompt = JSON.stringify(lead);
    const rawResponse = await this.ai.runOpenAI(
      prompt,
      "one parameter expected here",
    );
    // console.log(rawResponse);

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
