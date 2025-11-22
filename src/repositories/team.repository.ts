import mongoose from "mongoose";
import { TeamMember, TeamMemberAccountLeads } from "../models/team.model";


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
                permissions: "$role.permissions"
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

    async assignTaskToMember(memberId: string, accountId: string, leadId: string): Promise<any> {

        const isExist = await TeamMemberAccountLeads.findOne({ teamMemberId: memberId, accountsId: accountId,leadId:leadId });
        if (isExist) {
            throw new Error("Leads and account already assigned to this team member");
        }
        const newAssignment = new TeamMemberAccountLeads({
            teamMemberId: memberId,
            accountsId: accountId,
            leadId: leadId,
        });
        return await newAssignment.save();
    }   

}