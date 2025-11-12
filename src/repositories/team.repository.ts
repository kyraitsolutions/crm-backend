import { Team } from "../models/team.model";


export class TeamRepository {
    async getTeamMembers(accountId: string): Promise<any[]> {
        return await Team.find({ accountsId: accountId });
    }
    async getTeamMemberById(id: string): Promise<any> {
        return await Team.findById(id);
    }
    async createTeamMember(teamMember: any): Promise<any> {
        return await Team.create(teamMember);
    }
    async updateTeamMember(id: string, teamMember: any): Promise<any> {
        return await Team.findByIdAndUpdate(id, teamMember);
    }
    async deleteTeamMember(id: string): Promise<any> {
        return await Team.findByIdAndDelete(id);
    }
}