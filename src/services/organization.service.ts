import { TOrganizationDocument } from "../models/organization.model";
import { OrganizationRepository } from "../repositories/organization.repository";
import { TOrganization, TOrganizationMember } from "../types/organization.type";

export class OrganizationService {
  private organizationRepository: OrganizationRepository;
  constructor() {
    this.organizationRepository = new OrganizationRepository();
  }

  async createOrganization(
    data: TOrganization,
  ): Promise<TOrganizationDocument | null> {
    return await this.organizationRepository.create(data);
  }

  async getOrganizationDetailsByOrganizationId(id: string) {
    return await this.organizationRepository.findById(id);
  }

  async createOrganizationMember(data: TOrganizationMember) {
    return await this.organizationRepository.createOrganizationMember(data);
  }

  async getOrganizationMembersByUserId(id: string) {
    return await this.organizationRepository.getOrganizationMembersByUserId(id);
  }
  async isOrganizationExists(id: string): Promise<boolean> {
    const organization =
      await this.organizationRepository.findByCreatedById(id);
    return organization;
  }
}
