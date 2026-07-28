import { ClientSession } from "mongoose";
import { Organization } from "../models/organization.model.js";
import { TOrganization } from "../types/organization.type.js";

export class OrganizationRepository {
  // ORGANIZATIONS
  async create(
    data: Partial<TOrganization>,
    session: ClientSession,
  ): Promise<TOrganization> {
    const organization = await Organization.create([data], { session });
    return organization[0].toJSON();
  }

  async update(
    orgId: string,
    data: Partial<TOrganization>,
    session?: ClientSession,
  ): Promise<TOrganization | null> {
    return await Organization.updateOne(
      { _id: orgId },
      { $set: data },
      { new: true, session },
    ).lean();
  }
  async findAll(): Promise<any> {
    return await Organization.find({});
  }
  async findById(id: string): Promise<TOrganization | null> {
    return Organization.findById(id);
  }
  async findByCreatedById(id: string): Promise<any> {
    return Organization.findOne({ createdBy: id });
  }
}
