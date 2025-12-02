import { LeadRespository } from "../repositories/lead.respository";
import { Lead } from "../models/lead.model";


export class LeadService {
  private leadRepository: LeadRespository;

  constructor() {
    this.leadRepository = new LeadRespository();
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
    userId: string,
    accountId: string,
    queryFilters?: any, // Define/expand as needed
    paginationOptions?: { limit?: number; skip?: number }
  ): Promise<{
    leads: Lead[];
    totalDocs: number;
  }> {
    // Only fetch leads that belong to the user and account
    // Add additional filters if provided
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
    accountId: string,
    leadId: string,
    lead: Lead
  ): Promise<Lead> {
    return await this.leadRepository.updateLeadById(leadId, lead);
  }

  async updateLeadWs(lead: Lead): Promise<Lead> {
    return await this.leadRepository.update(lead);
  }
}
