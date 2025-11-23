import mongoose from "mongoose";
import { TeamMember, TeamMemberAccountLeads } from "../models/team.model";
import { RoleModel } from "../models/user.model";


export class TeamRepository {
    
    async getTeamMembers(orgId: string): Promise<any[]> {
        const memberData = await TeamMember.aggregate([
            {
                $match: { orgId: new mongoose.Types.ObjectId(orgId) }
            },

            // USER PROFILE
            {
                $lookup: {
                    from: "userprofiles",
                    localField: "userId",
                    foreignField: "userId",
                    as: "profile"
                }
            },
            { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },

            // USER TABLE (email, googleId, etc.)
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "user"
                }
            },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },

            // ROLE TABLE
            {
                $lookup: {
                    from: "roles",
                    localField: "roleId",
                    foreignField: "_id",
                    as: "role"
                }
            },
            { $unwind: { path: "$role", preserveNullAndEmptyArrays: true } },

            // Team member assignments to accounts and leads
            {
                $lookup: {
                    from: "teammemberaccountleads",
                    localField: "_id",
                    foreignField: "teamMemberId",
                    as: "assignments"
                }
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
                        in: "$$a.accountId"
                    }
                    }

                }
            }
        ]);

        return memberData;
    }


    async getTeamMemberById(id: string): Promise<any> {
        return await TeamMember.findById(id);
    }
    async createTeamMember(teamMember: any): Promise<any> {
        return await TeamMember.create(teamMember);
    }
    async updateTeamMember(id: string, teamMember: any): Promise<any> {
        return await TeamMember.findByIdAndUpdate(id, teamMember);
    }
    async deleteTeamMember(id: string): Promise<any> {
        return await TeamMember.findByIdAndDelete(id);
    }

    async assignAccountToMember(
        userId: string,
        accountIds: string[], 
        leadId: string
    ): Promise<any> {


        const role = await RoleModel.findOne({ name: "ACCOUNT_MANAGER" });

        const member = await TeamMember.findOne({ userId: new mongoose.Types.ObjectId(userId) });
        if (!member) {
            throw new Error("Team member not found");
        }

        if (!Array.isArray(accountIds)) {
            throw new Error("accountIds must be a non-empty array");
        }
        
        await TeamMemberAccountLeads.deleteMany({
            teamMemberId: member._id,
            // accountId: { $in: accountIds },
            leadId:null
        })
        const results = [];

        for (const accountId of accountIds) {
            // Check if record already exists
            const isExist = await TeamMemberAccountLeads.findOne({
                teamMemberId: member._id,
                accountId,
            });

            if (isExist) {
            // Skip existing record
                continue;
            }

            // Create new assignment
            const newAssignment = new TeamMemberAccountLeads({
                teamMemberId: member._id,
                accountId,
                leadId: leadId && leadId.trim() !== "" ? leadId : null,
                roleId: role?._id,
            });

            const saved = await newAssignment.save();
            results.push(saved);
        }

        return results;
    }

    async getAccountsByTeamMember(userId:string):Promise<any[]>{
        const member=await TeamMember.findOne({userId:new mongoose.Types.ObjectId(userId)});
        if(!member){
            throw new Error("Team member not found");
        }
        const assignments=await TeamMemberAccountLeads.find({teamMemberId:member?._id});
        return assignments;
    }

}