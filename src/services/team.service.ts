import mongoose, { ClientSession } from "mongoose";
import { ROLES } from "../config/permissions.js";
import { rbacService } from "../container.js";
import {
  CreateOrganizationMemberDto,
  OrganizationMemberResponseDto,
} from "../dtos/organization.dto.js";
import { TeamMemberDto } from "../dtos/team.dto.js";
// import { OrganizationRepository } from "../repositories/organization.repository.js";
import { TeamRepository } from "../repositories/team.repository.js";
import { UserAccountRepository } from "../repositories/user-account.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { UserProfileRepository } from "../repositories/userprofile.repository.js";
import { TOrganizationMember } from "../types/organization.type.js";
import { TUser } from "../types/user.type.js";
import { EmailService } from "./email.service.js";

export class TeamService {
  private teamRepository: TeamRepository;
  private userRepository: UserRepository;
  private emailService: EmailService;
  private userprofileRepository: UserProfileRepository;
  // private organizationRepository: OrganizationRepository;
  private userAccountRepository: UserAccountRepository;
  constructor() {
    this.userRepository = new UserRepository();
    this.emailService = new EmailService();
    this.teamRepository = new TeamRepository();
    this.userprofileRepository = new UserProfileRepository();
    // this.organizationRepository = new OrganizationRepository();
    this.userAccountRepository = new UserAccountRepository();
  }
  async getTeamMembers(orgId: string): Promise<any[]> {
    const teamMembers = await this.teamRepository.getTeamMembers(orgId);
    return (
      teamMembers?.map((teamMember: TOrganizationMember) => teamMember) ?? []
    );
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
    teamMember: {
      email: string;
      firstName: string;
      lastName?: string;
      roleId?: string;
      accounts?: {
        accountId: string;
        roleId: string;
      }[];
    },
  ): Promise<OrganizationMemberResponseDto> {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const accountMangerRole = await rbacService.getRoleByOrgIdAndName(
        orgId,
        ROLES.ACCOUNT_MANAGER,
      );

      const roleId = teamMember?.roleId || accountMangerRole?.id;

      // create tema member user
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
  async deleteTeamMember(ids: string[]): Promise<any> {
    if (!ids || !ids.length) throw new Error("Ids are required");
    const deletedTeamMember = await this.teamRepository.deleteTeamMembers(ids);
    return deletedTeamMember ? new TeamMemberDto(deletedTeamMember) : null;
  }
  async assignAccountToMember(
    userId: string,
    orgId: string,
    accounts: {
      accountId: string;
      roleId: string;
    }[],
    session?: ClientSession,
  ): Promise<any> {
    if (!Array.isArray(accounts)) {
      throw new Error("accountIds must be a non-empty array");
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
