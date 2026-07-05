import mongoose, { ClientSession } from "mongoose";
import { ROLES } from "../config/permissions.js";
import { rbacService } from "../container.js";
import {
  CreateOrganizationMemberDto,
  OrganizationMemberResponseDto,
} from "../dtos/organization.dto.js";
import { CreateTeamMemberDto } from "../dtos/team.dto.js";
// import { OrganizationRepository } from "../repositories/organization.repository.js";
import { TeamRepository } from "../repositories/team.repository.js";
import { UserAccountRepository } from "../repositories/user-account.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { UserProfileRepository } from "../repositories/userprofile.repository.js";
import { TOrganizationMember } from "../types/organization.type.js";
import { TUser } from "../types/user.type.js";
import { EmailService } from "./email.service.js";
import { OrganizationRepository } from "../repositories/organization.repository.js";
import {
  TApiResponse,
  TPaginatedResponse,
} from "../types/api-response.type.js";

export class TeamService {
  private teamRepository: TeamRepository;
  private userRepository: UserRepository;
  private emailService: EmailService;
  private userprofileRepository: UserProfileRepository;
  private organizationRepository: OrganizationRepository;
  private userAccountRepository: UserAccountRepository;
  constructor() {
    this.userRepository = new UserRepository();
    this.emailService = new EmailService();
    this.teamRepository = new TeamRepository();
    this.userprofileRepository = new UserProfileRepository();
    this.organizationRepository = new OrganizationRepository();
    this.userAccountRepository = new UserAccountRepository();
  }
  async getTeamMembers(orgId: string): Promise<TPaginatedResponse<any>> {
    const organization = await this.organizationRepository.findById(orgId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    const teamMembers = await this.teamRepository.getTeamMembers(orgId);
    return {
      docs:
        teamMembers?.map((teamMember: TOrganizationMember) => teamMember) ?? [],
    };
  }
  async getTeamMemberById(id: string): Promise<any> {
    const teamMember =
      await this.teamRepository.getOrganizationMembersByUserId(id);
    return teamMember ? teamMember : null;
  }

  async createTemaUser(email: string, session?: ClientSession): Promise<TUser> {
    const isUserExist = await this.userRepository.findByEmail(email);

    if (isUserExist) {
      throw new Error("User already assigned");
    }

    const newUser = await this.userRepository.create(
      {
        email: email,
        onboarding: true,
      },
      session,
    );

    return newUser;
  }
  async createTeamMember(
    userId: string,
    orgId: string,
    teamMember: CreateTeamMemberDto,
  ): Promise<OrganizationMemberResponseDto> {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const accountMangerRole = await rbacService.getRoleByOrgIdAndName(
        orgId,
        ROLES.ACCOUNT_MANAGER,
      );

      const roleId = teamMember?.roleId || accountMangerRole?.id;

      // create team member user
      const newTeamMember = await this.createTemaUser(
        teamMember?.email,
        session,
      );

      // create user profile
      const newTeamMemberProfilePayload = {
        userId: newTeamMember.id as string,
        firstName: teamMember.firstName,
        lastName: teamMember.lastName,
      };
      await this.userprofileRepository.create(
        newTeamMemberProfilePayload,
        session,
      );

      const role = await rbacService.getRoleById(String(roleId));

      if (!role) {
        throw new Error("Role not found");
      }

      if (role.organizationId.toString() !== orgId.toString()) {
        throw new Error("Role not belongs to this organization");
      }

      if (role.isSystemRole && role.name === ROLES.OWNER) {
        throw new Error("This role cannot be assigned");
      }

      // create organization member
      const newOrganizationMemberPayload = new CreateOrganizationMemberDto({
        userId: newTeamMember.id as string,
        organizationId: orgId as string,
        invitedBy: userId as string,
        roleId: roleId as string,
        isActive: true,
      });

      const organizationMember =
        await this.teamRepository.createOrganizationMember(
          newOrganizationMemberPayload,
          session,
        );

      // assign account to member
      await this.assignAccountToMember(
        newTeamMember.id as string,
        orgId,
        teamMember?.accounts || [],
        session,
      );

      // call email service to send invitation email
      const url = `${process.env.FRONTEND_URL}/login`;
      this.emailService.queueWelcomeEmail(teamMember.email, url);

      await session.commitTransaction();

      return {
        id: organizationMember.id as string,
        userId: newTeamMember.id as string,
        accounts: teamMember?.accounts || [],
        email: teamMember.email,
        userProfile: {
          firstName: teamMember.firstName,
          lastName: teamMember.lastName,
        },
        role: {
          id: roleId as string,
          name: accountMangerRole?.name as string,
        },
        status: organizationMember.isActive as boolean,
        createdAt: organizationMember.createdAt as Date,
        updatedAt: organizationMember.updatedAt as Date,
      };
    } catch (error) {
      session.abortTransaction();
      throw error;
    }
  }
  async updateTeamMember(
    id: string,
    teamMember: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      roleId?: string;
      accounts?: {
        accountId: string;
        roleId: string;
      }[];
    },
  ): Promise<any> {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      // 1️⃣ Get existing organization member
      const existingMember =
        await this.teamRepository.getOrganizationMembersByUserId(id);

      if (!existingMember) {
        throw new Error("Team member not found");
      }

      const userId = existingMember.userId;
      const orgId = existingMember.organizationId?.id;

      // 2️⃣ Update USER (email)
      if (teamMember.email) {
        await this.userRepository.update(
          userId,
          { email: teamMember.email },
          session,
        );
      }

      // 3️⃣ Update USER PROFILE (name, phone)
      if (teamMember.firstName || teamMember.lastName || teamMember.phone) {
        await this.userprofileRepository.update(
          userId,
          {
            ...(teamMember.firstName && { firstName: teamMember.firstName }),
            ...(teamMember.lastName && { lastName: teamMember.lastName }),
            ...(teamMember.phone && { phone: teamMember.phone }),
          },
          session,
        );
      }

      // 4️⃣ Update ORGANIZATION MEMBER (role)
      if (teamMember.roleId) {
        await this.teamRepository.updateTeamMember(
          id,
          { roleId: teamMember.roleId },
          session,
        );
      }

      // 5️⃣ Update USER ACCOUNTS
      if (teamMember.accounts) {
        await this.assignAccountToMember(userId, orgId, teamMember.accounts);
      }

      await session.commitTransaction();
      session.endSession();

      return { message: "Team member updated successfully" };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  async deleteTeamMembers(
    orgId: string,
    ids: string[],
  ): Promise<TApiResponse<{ ids: string[] }>> {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();
      const members =
        await this.teamRepository.getOrganizationMembersByUserIds(ids);

      if (members.length !== ids.length) {
        throw new Error("Team member not found");
      }

      const invalidMembers = members.filter(
        (member) => String(member.organizationId) !== orgId,
      );

      if (invalidMembers.length) {
        throw new Error("Members do not belong to this organization");
      }

      const ownerExists = members.some(
        (member: any) => member.roleId?.name === ROLES.OWNER,
      );

      if (ownerExists) {
        throw new Error("Owner cannot be deleted");
      }

      // await Promise.all([
      //   this.teamRepository.deleteOrganizationMembers(ids, session),
      //   this.userAccountRepository.deleteByUserIds(ids, session),
      //   this.userprofileRepository.deleteByUserIds(ids, session),
      //   this.userRepository.deleteMany(ids, session),
      // ]);

      await this.teamRepository.deleteOrganizationMembers(ids, session);
      await this.userAccountRepository.deleteByUserIds(ids, session);
      await this.userprofileRepository.deleteByUserIds(ids, session);
      await this.userRepository.deleteMany(ids, session);

      await session.commitTransaction();

      return {
        doc: {
          ids: ids,
        },
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }
  // async deleteTeamMember(ids: string[]): Promise<any> {
  //   try {
  //     if (!ids || !ids.length) throw new Error("Ids are required");
  //     const deletedTeamMember =
  //       await this.teamRepository.deleteTeamMembers(ids);
  //     return deletedTeamMember ? new TeamMemberDto(deletedTeamMember) : null;
  //   } catch (error) {}
  // }
  async assignAccountToMember(
    userId: string,
    orgId: string,
    accounts: {
      accountId: string;
      roleId: string;
    }[],
    session?: ClientSession,
  ): Promise<any> {
    console.log("org Id", orgId);
    if (!Array.isArray(accounts)) {
      throw new Error("accountIds must be a non-empty array");
    }

    for (const account of accounts) {
      const role = await rbacService.getRoleById(account.roleId);

      if (!role) {
        throw new Error(`Invalid role for account ${account.accountId}`);
      }

      console.log("role to hai", role);

      if (role.organizationId.toString() !== orgId.toString()) {
        throw new Error(
          `Role not belongs to this organization for account ${account.accountId}`,
        );
      }

      if (role.name === ROLES.OWNER) {
        throw new Error(
          `${role.name} role cannot be assigned to account ${account.accountId}`,
        );
      }
    }

    await this.userAccountRepository.deleteByUserAndOrg(userId, orgId);
    const payload = accounts.map((account) => ({
      userId,
      accountId: account.accountId,
      roleId: account.roleId,
      organizationId: orgId,
    }));

    // ✅ Step 3: Bulk insert (fast & scalable)
    const newAssignments = await this.userAccountRepository.bulkInsert(
      payload,
      session,
    );
    return newAssignments;
  }
}
