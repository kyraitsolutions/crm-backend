import { HttpError } from "../utils/http.error.js";
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
import { AccountRepository } from "../repositories/account.repository.js";
import {
  TApiResponse,
  TPaginatedResponse,
} from "../types/api-response.type.js";
// import { ActivityLogRepository } from "../repositories/activityLog.repository.js";
import { ActivityLogService } from "./activityLog.service.js";
import { TActivityLog } from "../types/activityLog.type.js";
import { RequestContext } from "../types/common.js";
import { SubscriptionService } from "./subscription.service.js";
import { USAGE_METRIC } from "../constants/subscription.constant.js";

export class TeamService {
  private teamRepository: TeamRepository;
  private userRepository: UserRepository;
  private emailService: EmailService;
  private userprofileRepository: UserProfileRepository;
  private organizationRepository: OrganizationRepository;
  private userAccountRepository: UserAccountRepository;
  private accountRepository: AccountRepository;
  private activityLogService: ActivityLogService;
  constructor() {
    this.userRepository = new UserRepository();
    this.emailService = new EmailService();
    this.teamRepository = new TeamRepository();
    this.userprofileRepository = new UserProfileRepository();
    this.organizationRepository = new OrganizationRepository();
    this.userAccountRepository = new UserAccountRepository();
    this.accountRepository = new AccountRepository();
    this.activityLogService = new ActivityLogService();
  }
  async getTeamMembers(orgId: string): Promise<TPaginatedResponse<any>> {
    const organization = await this.organizationRepository.findById(orgId);
    if (!organization) {
      throw HttpError.notFound("Organization not found");
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
      throw HttpError.conflict("User already assigned");
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
    context: RequestContext,
    teamMember: CreateTeamMemberDto,
  ): Promise<TApiResponse<OrganizationMemberResponseDto>> {
    const session = await mongoose.startSession();
    try {
      const orgId = context.organizationId;
      const userId = context.userId;

      await new SubscriptionService().checkLimit(
        orgId,
        USAGE_METRIC.TEAM_MEMBERS,
      );

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

      // find role
      const role = await rbacService.getRoleById(String(roleId));

      if (!role) {
        throw HttpError.notFound("Role not found");
      }

      if (role.organizationId.toString() !== orgId.toString()) {
        throw HttpError.forbidden("Role not belongs to this organization");
      }

      if (role.isSystemRole && role.name === ROLES.OWNER) {
        throw HttpError.forbidden("This role cannot be assigned");
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

      // Activity Log
      const activityLogDataPayload: Partial<TActivityLog> = {
        // accountId: String(),
        organizationId: String(orgId),

        entityType: "teamMember",
        entityId: String(organizationMember.id),

        actor: {
          type: "user",
          id: context.userId,
          name: context.userName,
        },

        metadata: {
          teamMemberName: teamMember?.firstName,
          teamMemberEmail: teamMember?.email,
        },
      };

      await this.activityLogService.logCreate(activityLogDataPayload);

      // call email service to send invitation email
      const url = `${process.env.FRONTEND_URL}/login`;
      this.emailService.queueWelcomeEmail(teamMember.email, url);

      await session.commitTransaction();

      return {
        doc: {
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
        },
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
        throw HttpError.notFound("Team member not found");
      }

      const userId = String(existingMember.userId);
      const orgId =
        existingMember.organizationId?.id || existingMember.organizationId;

      const [existingUser, existingProfile, existingAccountRows] =
        await Promise.all([
          this.userRepository.findById(userId),
          this.userprofileRepository.findByUserId(userId),
          this.userAccountRepository.getUserAccontsByUserId(userId),
        ]);

      const profile =
        typeof (existingProfile as any)?.toJSON === "function"
          ? (existingProfile as any).toJSON()
          : existingProfile;

      // Activity: only request fields that actually changed (never dump org-member internals)
      const oldSnap: Record<string, unknown> = {};
      const newSnap: Record<string, unknown> = {};

      const track = (key: string, from: unknown, to: unknown) => {
        const a = from == null ? "" : String(from).trim();
        const b = to == null ? "" : String(to).trim();
        if (a === b) return;
        oldSnap[key] = from ?? null;
        newSnap[key] = to ?? null;
      };

      if (teamMember.email !== undefined) {
        track("email", existingUser?.email, teamMember.email);
      }
      if (teamMember.firstName !== undefined) {
        track("firstName", profile?.firstName, teamMember.firstName);
      }
      if (teamMember.lastName !== undefined) {
        track("lastName", profile?.lastName, teamMember.lastName);
      }
      if (teamMember.phone !== undefined) {
        track("phone", profile?.phone, teamMember.phone);
      }

      if (teamMember.roleId !== undefined) {
        const oldRoleId = String(
          existingMember.roleId?.id ||
            existingMember.roleId?._id ||
            existingMember.roleId ||
            "",
        );
        const newRoleId = String(teamMember.roleId);
        if (oldRoleId !== newRoleId) {
          const newRole = await rbacService.getRoleById(newRoleId);
          oldSnap.role =
            existingMember.roleId?.name || oldRoleId || null;
          newSnap.role = newRole?.name || newRoleId;
        }
      }

      if (Array.isArray(teamMember.accounts)) {
        const normalizeAccounts = (
          rows: { accountId?: string; roleId?: string }[],
        ) =>
          [...rows]
            .map((r) => ({
              accountId: String(r.accountId || ""),
              roleId: String(r.roleId || ""),
            }))
            .filter((r) => r.accountId)
            .sort((a, b) => a.accountId.localeCompare(b.accountId));

        const beforeAccounts = normalizeAccounts(
          (existingAccountRows || []).map((r: any) => ({
            accountId: String(r.accountId),
            roleId: String(r.roleId),
          })),
        );
        const afterAccounts = normalizeAccounts(teamMember.accounts);

        if (
          JSON.stringify(beforeAccounts) !== JSON.stringify(afterAccounts)
        ) {
          oldSnap.accounts = await this.describeAccountAssignments(
            beforeAccounts,
          );
          newSnap.accounts = await this.describeAccountAssignments(
            afterAccounts,
          );
        }
      }

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
        await this.assignAccountToMember(
          userId,
          String(orgId),
          teamMember.accounts,
          session,
        );
      }

      await session.commitTransaction();
      session.endSession();

      if (Object.keys(oldSnap).length > 0) {
        await this.activityLogService.logUpdate({
          oldDoc: oldSnap,
          newDoc: newSnap,
          organizationId: String(orgId || ""),
          entityType: "teamMember",
          entityId: String(id),
          actor: { type: "user", name: "" },
          metadata: {
            email: teamMember.email || existingUser?.email,
            name: `${teamMember.firstName || profile?.firstName || ""} ${teamMember.lastName || profile?.lastName || ""}`.trim(),
          },
        });
      }

      return { message: "Team member updated successfully" };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /** Human-readable account assignment labels for activity logs */
  private async describeAccountAssignments(
    accounts: { accountId: string; roleId: string }[],
  ): Promise<string[]> {
    const labels: string[] = [];
    for (const row of accounts) {
      const [account, role] = await Promise.all([
        this.accountRepository.findOne(row.accountId),
        rbacService.getRoleById(row.roleId),
      ]);
      const accountName =
        (account as any)?.accountName ||
        (account as any)?.name ||
        row.accountId;
      const roleName = role?.name || row.roleId;
      labels.push(`${accountName} (${roleName})`);
    }
    return labels;
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
        throw HttpError.notFound("Team member not found");
      }

      const invalidMembers = members.filter(
        (member) => String(member.organizationId) !== orgId,
      );

      if (invalidMembers.length) {
        throw HttpError.forbidden("Members do not belong to this organization");
      }

      const ownerExists = members.some(
        (member: any) => member.roleId?.name === ROLES.OWNER,
      );

      if (ownerExists) {
        throw HttpError.forbidden("Owner cannot be deleted");
      }

      await this.teamRepository.deleteOrganizationMembers(ids, session);
      await this.userAccountRepository.deleteByUserIds(ids, session);
      await this.userprofileRepository.deleteByUserIds(ids, session);
      await this.userRepository.deleteMany(ids, session);

      await session.commitTransaction();

      for (const member of members) {
        await this.activityLogService.logDelete({
          organizationId: orgId,
          entityType: "teamMember",
          entityId: String((member as any)?.id || (member as any)?._id || (member as any)?.userId),
          actor: { type: "user", name: "" },
          metadata: {
            userId: String((member as any)?.userId || ""),
          },
          deletedData: {
            userId: (member as any)?.userId,
            roleId: (member as any)?.roleId,
          },
        });
      }

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
  //     if (!ids || !ids.length) throw HttpError.badRequest("Ids are required");
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
      throw HttpError.badRequest("accountIds must be a non-empty array");
    }

    for (const account of accounts) {
      const role = await rbacService.getRoleById(account.roleId);

      if (!role) {
        throw HttpError.badRequest(`Invalid role for account ${account.accountId}`);
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

    await this.userAccountRepository.deleteByUserAndOrg(userId, orgId, session);
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
