import { ClientSession } from "mongoose";
import { CreateOrganizationDto } from "../dtos/organization.dto";
import { OrganizationRepository } from "../repositories/organization.repository";
import { TOrganizationMember } from "../types/organization.type";
import { TeamRepository } from "../repositories/team.repository";

export class OrganizationService {
  constructor(
    private organizationRepository: OrganizationRepository,
    private teamRepository: TeamRepository,
  ) {}

  //============ ORGANIZATION SERVICE =============

  // ORGANIZATION CREATE SERVICE
  async create(
    data: CreateOrganizationDto,
    session: ClientSession,
  ): Promise<any> {
    return this.organizationRepository.create(data, session);
  }
  // ORGANIZATION DETAILS GET BY ORGANIZATION ID SERVICE
  async getOrganizationDetailsByOrganizationId(id: string) {
    return await this.organizationRepository.findById(id);
  }

  // CHECK IF ORGANIZATION EXISTS
  async isOrganizationExists(id: string): Promise<boolean> {
    const organization =
      await this.organizationRepository.findByCreatedById(id);
    return organization;
  }

  //============ ORGANIZATION MEMBERS SERVICE =============
  //CREATE ORGANIZATION MEMBERS (USERS)
  async createOrganizationMember(
    data: Partial<TOrganizationMember>,
    session: ClientSession,
  ) {
    return await this.teamRepository.createOrganizationMember(data, session);
  }

  // GET ORGANIZATION MEMBERS BY USER ID
  async getOrganizationMembersByUserId(id: string) {
    return await this.teamRepository.getOrganizationMembersByUserId(id);
  }
}
