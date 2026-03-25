import { Organization } from "../models/organization.model";
import { OrganizationMember } from "../models/organizationMember.model";
import { TOrganization, TOrganizationMember } from "../types/organization.type";

export class OrganizationRepository {
  // organizations
  async findAll(): Promise<any> {
    return await Organization.find({});
  }
  async findById(id: string): Promise<any> {
    return Organization.findById(id);
  }
  async findByCreatedById(id: string): Promise<any> {
    return Organization.findOne({ createdBy: id });
  }
  async create(data: TOrganization): Promise<any> {
    return await Organization.create(data);
  }

  // organization member
  async createOrganizationMember(data: TOrganizationMember): Promise<any> {
    const isOrganizationMemberExists = await OrganizationMember.findOne({
      organizationId: data?.organizationId,
      userId: data?.userId,
    });

    if (!isOrganizationMemberExists) {
      return await OrganizationMember.create(data);
    }

    throw new Error("User is already assinged to this organization");
  }

  async getOrganizationMembersByUserId(id: string): Promise<any> {
    return await OrganizationMember.findOne({ userId: id }).populate(
      "organizationId",
      "name",
    );
  }

  async getOrganizationMembersByUserIdAndOrgId(id: string): Promise<any> {
    return await OrganizationMember.find({ userId: id })
      .populate("organizationId", "name")
      .select("organizationId");
  }
}
