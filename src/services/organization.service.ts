import { ClientSession } from "mongoose";
import {
  CreateOrganizationDto,
  CreateOrganizationResponseDto,
  OrganizationResponseDto,
} from "../dtos/organization.dto.js";
import { OrganizationRepository } from "../repositories/organization.repository.js";
import { TOrganizationMember } from "../types/organization.type.js";
import { TeamRepository } from "../repositories/team.repository.js";
import { TApiResponse } from "../types/api-response.type.js";

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
  ): Promise<CreateOrganizationResponseDto | null> {
    const organization = await this.organizationRepository.create(
      data,
      session,
    );

    return organization ? organization : null;
  }
  // ORGANIZATION DETAILS GET BY ORGANIZATION ID SERVICE
  async getOrganizationDetailsByOrganizationId(
    id: string,
  ): Promise<{ doc: OrganizationResponseDto }> {
    const organization = await this.organizationRepository.findById(id);

    if (!organization) throw new Error("Organization not found");

    return {
      doc: new OrganizationResponseDto(organization),
    };
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
