import mongoose from "mongoose";
import { TeamMember, TeamMemberAccountLeads } from "../models/team.model.js";
import { RoleModel, UserModel } from "../models/user.model.js";
import { ObjectId } from "mongodb";
import { UserAccount } from "../models/user.accounts.model.js";
import { OrganizationRepository } from "./organization.repository.js";

export class TeamRepository {
  private organizationRepository = new OrganizationRepository();

  constructor() {
    this.organizationRepository = new OrganizationRepository();
  }

  async getTeamMembers(orgId: string): Promise<any[]> {
    console.log("aaya");
    console.log(orgId);
    const memberData = await TeamMember.aggregate([
      {
        $match: { orgId: new mongoose.Types.ObjectId(orgId) },
      },

      // USER PROFILE
      {
        $lookup: {
          from: "userprofiles",
          localField: "userId",
          foreignField: "userId",
          as: "profile",
        },
      },
      { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },

      // USER TABLE (email, googleId, etc.)
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },

      // ROLE TABLE
      {
        $lookup: {
          from: "roles",
          localField: "roleId",
          foreignField: "_id",
          as: "role",
        },
      },
      { $unwind: { path: "$role", preserveNullAndEmptyArrays: true } },

      // Team member assignments to accounts and leads
      {
        $lookup: {
          from: "teammemberaccountleads",
          localField: "_id",
          foreignField: "teamMemberId",
          as: "assignments",
        },
      },
      // { $unwind: { path: "$assignments", preserveNullAndEmptyArrays: true } },

      // FINAL OUTPUT
      {
        $project: {
          _id: 1,
          userId: 1,
          roleId: 1,
          status: 1,
          inviteStatus: 1,
          createdAt: 1,

          // USER TABLE
          email: "$user.email",
          googleId: "$user.googleId",

          // USER PROFILE
          firstName: "$profile.firstName",
          lastName: "$profile.lastName",
          organizationName: "$profile.organizationName",

          // ROLE
          roleName: "$role.name",
          permissions: "$role.permissions",

          // ⭐ GET ALL ACCOUNT IDS ASSIGNED TO THIS TEAM MEMBER
          accountIds: {
            $map: {
              input: "$assignments",
              as: "a",
              in: "$$a.accountId",
            },
          },
        },
      },
    ]).sort({ createdAt: -1 });

    return memberData;
  }
  async getTeamMemberById(id: string): Promise<any> {
    return await TeamMember.findOne({
      userId: new mongoose.Types.ObjectId(id),
    });
  }
  async createTeamMember(teamMember: any): Promise<any> {
    return await TeamMember.create(teamMember);
  }
  async assignAccountToMember(
    userId: string,
    orgId: string,
    accountIds: string[],
  ): Promise<any> {
    const member =
      await this.organizationRepository.getOrganizationMembersByUserId(userId);

    if (!member) {
      throw new Error("User not found");
    }

    if (!Array.isArray(accountIds)) {
      throw new Error("accountIds must be a non-empty array");
    }

    await UserAccount.deleteMany({
      userId,
      organizationId: orgId,
    });

    const payload = accountIds.map((accountId) => ({
      userId,
      accountId,
      organizationId: orgId,
    }));

    // ✅ Step 3: Bulk insert (fast & scalable)
    const newAssignments = await UserAccount.insertMany(payload);

    return newAssignments;
  }
  async updateTeamMember(id: string, teamMember: any): Promise<any> {
    return await TeamMember.findByIdAndUpdate(id, teamMember);
  }
  async deleteTeamMember(id: string): Promise<any> {
    const teamMemberId = new ObjectId(id);
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // 1. Delete user from User table
      const user = await UserModel.findByIdAndDelete(
        { _id: teamMemberId },
        { session },
      );
      // 2. Delete user from Team member table
      await TeamMember.findOneAndDelete({ userId: teamMemberId }, { session });
      // 3. Delete all assigned accounts to this user
      await TeamMemberAccountLeads.deleteMany(
        { teamMemberId: teamMemberId },
        { session },
      );
      // commit
      await session.commitTransaction();
      session.endSession();
      return user;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }
  async getAccountsByTeamMember(userId: string): Promise<any[]> {
    console.log(userId);
    // const member = await TeamMember.findOne({
    //   userId: new mongoose.Types.ObjectId(userId),
    // });
    // if (!member) {
    //   throw new Error("Team member not found");
    // }
    const assignments = await UserAccount.find({
      userId: userId,
    });
    return assignments;
  }
}
