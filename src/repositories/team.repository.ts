import mongoose, { ClientSession } from "mongoose";
import { OrganizationMember } from "../models/organizationMember.model.js";
import { UserAccount } from "../models/user.accounts.model.js";
import { UserModel } from "../models/user.model.js";
import { UserProfileModel } from "../models/userProfile.model.js";
import { TOrganizationMember } from "../types/organization.type.js";

export class TeamRepository {
  // ORGANIZATION MEMBERS (USERS)
  async createOrganizationMember(
    data: Partial<TOrganizationMember>,
    session?: ClientSession,
  ): Promise<TOrganizationMember> {
    const isOrganizationMemberExists = await OrganizationMember.findOne({
      organizationId: data?.organizationId,
      userId: data?.userId,
    });

    if (!isOrganizationMemberExists) {
      return (await OrganizationMember.create([data], { session }))[0].toJSON();
    }

    throw new Error("User is already assinged to this organization");
  }
  async getOrganizationMembersByUserId(id: string): Promise<any> {
    return (
      await OrganizationMember.findOne({ userId: id })
        .populate("organizationId", "name")
        .populate("roleId", "id name level")
    )?.toJSON();
  }
  async getOrganizationMembersByUserIdAndOrgId(id: string): Promise<any> {
    return await OrganizationMember.find({ userId: id })
      .populate("organizationId", "name")
      .select("organizationId");
  }
  async getTeamMembers(orgId: string): Promise<any[]> {
    const memberData = await OrganizationMember.aggregate([
      {
        $match: {
          organizationId: new mongoose.Types.ObjectId(orgId),
        },
      },

      // 👤 Profile
      {
        $lookup: {
          from: "userprofiles",
          localField: "userId",
          foreignField: "userId",
          as: "profile",
        },
      },
      { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },

      // 👤 User
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },

      // 🎭 Role
      {
        $lookup: {
          from: "roles",
          localField: "roleId",
          foreignField: "_id",
          as: "role",
        },
      },
      { $unwind: { path: "$role", preserveNullAndEmptyArrays: true } },

      // ✅ Accounts for NORMAL USERS (useraccounts)
      {
        $lookup: {
          from: "useraccounts",
          let: { userId: "$userId" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$userId", "$$userId"] },
              },
            },
            {
              $lookup: {
                from: "accounts",
                localField: "accountId",
                foreignField: "_id",
                as: "account",
              },
            },
            { $unwind: "$account" },
            {
              $project: {
                accountId: 1,
                roleId: 1,
                name: "$account.accountName",
              },
            },
          ],
          as: "memberAccounts",
        },
      },

      // ✅ Accounts for OWNER (direct from accounts collection)
      {
        $lookup: {
          from: "accounts",
          let: { userId: "$userId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$createdBy", "$$userId"] }, // 🔥 important
                  ],
                },
              },
            },
            {
              $project: {
                accountId: "$_id",
                roleId: null,
                name: "$accountName",
              },
            },
          ],
          as: "ownerAccounts",
        },
      },

      // 🔥 Merge both based on role
      {
        $addFields: {
          accounts: {
            $cond: [
              { $eq: ["$role.name", "OWNER"] },
              "$ownerAccounts",
              "$memberAccounts",
            ],
          },
          id: "$_id",
        },
      },

      // 🧹 Final Shape
      {
        $project: {
          _id: 0,
          id: 1,
          userId: "$user._id",
          email: "$user.email",
          googleId: "$user.googleId",
          createdAt: 1,
          updatedAt: 1,
          userProfile: {
            firstName: "$profile.firstName",
            lastName: "$profile.lastName",
            phone: "$profile.phone",
            profilePicture: "$profile.profilePicture",
          },
          role: {
            id: "$role._id",
            name: "$role.name",
          },
          accounts: 1,
        },
      },
    ]).sort({ createdAt: -1 }).sort({ createdAt: 1 });

    return memberData;
  }
  // async getTeamMembers(orgId: string): Promise<any[]> {
  //   const memberData = await OrganizationMember.aggregate([
  //     {
  //       $match: {
  //         organizationId: new mongoose.Types.ObjectId(orgId),
  //       },
  //     },
  //     {
  //       $lookup: {
  //         from: "userprofiles",
  //         localField: "userId",
  //         foreignField: "userId",
  //         as: "profile",
  //       },
  //     },
  //     { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
  //     {
  //       $lookup: {
  //         from: "users",
  //         localField: "userId",
  //         foreignField: "_id",
  //         as: "user",
  //       },
  //     },
  //     { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
  //     {
  //       $lookup: {
  //         from: "roles",
  //         localField: "roleId",
  //         foreignField: "_id",
  //         as: "role",
  //       },
  //     },
  //     { $unwind: { path: "$role", preserveNullAndEmptyArrays: true } },
  //     {
  //       $lookup: {
  //         from: "useraccounts",
  //         let: { userId: "$userId" },
  //         pipeline: [
  //           {
  //             $match: {
  //               $expr: { $eq: ["$userId", "$$userId"] },
  //             },
  //           },
  //           {
  //             $lookup: {
  //               from: "accounts",
  //               localField: "accountId",
  //               foreignField: "_id",
  //               as: "account",
  //             },
  //           },
  //           { $unwind: "$account" },
  //           {
  //             $project: {
  //               accountId: 1,
  //               roleId: 1,
  //               name: "$account.accountName",
  //             },
  //           },
  //         ],
  //         as: "accounts",
  //       },
  //     },
  //     {
  //       $addFields: {
  //         id: "$_id",
  //       },
  //     },
  //     {
  //       $project: {
  //         _id: 0,
  //         id: 1,
  //         userId: "$user._id",
  //         email: "$user.email",
  //         googleId: "$user.googleId",
  //         createdAt: 1,
  //         updatedAt: 1,
  //         userProfile: {
  //           firstName: "$profile.firstName",
  //           lastName: "$profile.lastName",
  //           phone: "$profile.phone",
  //           profilePicture: "$profile.profilePicture",
  //         },
  //         role: {
  //           id: "$role._id",
  //           name: "$role.name",
  //         },
  //         accounts: "$accounts",
  //         // accounts: {
  //         //   $map: {
  //         //     input: "$accounts",
  //         //     as: "acc",
  //         //     in: {
  //         //       accountId: "$$acc.accountId",
  //         //       roleId: "$$acc.roleId",
  //         //       accountName: "$$acc.accountName",
  //         //     },
  //         //   },
  //         // },
  //       },
  //     },
  //   ]).sort({ createdAt: -1 });

  //   return memberData;
  // }
  async updateTeamMember(
    id: string,
    data: Partial<TOrganizationMember>,
    session?: ClientSession,
  ): Promise<TOrganizationMember | null> {
    const member = await OrganizationMember.findOneAndUpdate(
      { userId: id },
      data,
      {
        new: true, // return updated doc
        session,
      },
    );

    return member?.toJSON() || null;
  }
  async deleteTeamMembers(ids: string[]): Promise<boolean> {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const objectIds = Array.isArray(ids)
        ? ids.map((id) => new mongoose.Types.ObjectId(id))
        : ids;

      // 1. delete team member relations
      await OrganizationMember.deleteMany({
        userId: { $in: objectIds },
      }).session(session);

      // 2. delete account mappings
      await UserAccount.deleteMany({
        userId: { $in: objectIds },
      }).session(session);

      // 3. delete users
      await UserModel.deleteMany({ _id: { $in: objectIds } }).session(session);

      // 4. delete users profile
      await UserProfileModel.deleteMany({ userId: { $in: objectIds } }).session(
        session,
      );

      await session.commitTransaction();
      return true;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
