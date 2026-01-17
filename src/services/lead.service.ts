import { LeadRespository } from "../repositories/lead.respository.js";
import { Lead } from "../models/lead.model.js";
// import { leadSummaryPrompt } from "../ai/ai.prompts.js";
import { GeminiAIUtil } from "../ai/ai.service.js";
import { safeJsonParse } from "../ai/ai.parsers.js";


export class LeadService {
  private leadRepository: LeadRespository;
  private ai: GeminiAIUtil;

  constructor() {
    this.leadRepository = new LeadRespository();
    this.ai = new GeminiAIUtil()
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
    queryFilters?: any, // Define/expand as needed
    paginationOptions?: { limit?: number; skip?: number }
  ): Promise<{
    leads: Lead[];
    totalDocs: number;
  } | null> {
    // Only fetch leads that belong to the user and account
    // Add additional filters if provided
    if (!accountId) {
      return null;
    }
    const criteria = {
      // userId,
      accountId,
      ...(queryFilters || {}),
    };

    const leads = await this.leadRepository.find(criteria, paginationOptions);
    const count = await this.leadRepository.countDocuments({
      accountId,
    });


    return {
      leads,
      totalDocs: count,
    };
  }

  async createLeadWs(lead: Lead): Promise<Lead> {
    return await this.leadRepository.create(lead);
  }

  async updateLead(
    _accountId: string,
    leadId: string,
    lead: Lead
  ): Promise<Lead | null> {
    return await this.leadRepository.updateLeadById(leadId, lead);
  }

  async updateLeadWs(lead: Lead): Promise<Lead | null> {
    return await this.leadRepository.update(lead);
  }


  async getLeadSummary(accountId: string, leadId: string): Promise<any> {
    const lead = await this.leadRepository.getLeadById(accountId, leadId);


    // For Gemini
    // const prompt=leadSummaryPrompt(lead);
    // const rawResponse = await this.ai.runGoogleAI({ prompt });

    // For Open AI
    const prompt = JSON.stringify(lead);
    const rawResponse = await this.ai.runOpenAI(prompt);
    // console.log(rawResponse);

    if (!rawResponse) {
      return null
    }
    const result = safeJsonParse(rawResponse)
    return result;
  }
}
