import { CreateTeamMemberDto, TeamMemberDto } from "../dtos/team.dto";
import { TeamRepository } from "../repositories/team.repository";

export class TeamService {
    private teamRepository: TeamRepository;
    constructor() {
        this.teamRepository = new TeamRepository();
    }
    async getTeamMembers(accountId: string): Promise<any[]> {
        const teamMembers = await this.teamRepository.getTeamMembers(accountId);
        return teamMembers?.map((teamMember: any) => new TeamMemberDto(teamMember)) ?? [];
    }
    async getTeamMemberById(id: string): Promise<any> {
        const teamMember = await this.teamRepository.getTeamMemberById(id);
        return teamMember ? new TeamMemberDto(teamMember) : null;
    }
    async createTeamMember(teamMember: CreateTeamMemberDto): Promise<any> {
        const newTeamMember = await this.teamRepository.createTeamMember(teamMember);
        return newTeamMember ? new TeamMemberDto(newTeamMember) : null;
    }
    async updateTeamMember(id: string, teamMember: any): Promise<any> {
        const updatedTeamMember = await this.teamRepository.updateTeamMember(id, teamMember);
        return updatedTeamMember ? new TeamMemberDto(updatedTeamMember) : null;
    }
    async deleteTeamMember(id: string): Promise<any> {
        const deletedTeamMember = await this.teamRepository.deleteTeamMember(id);
        return deletedTeamMember ? new TeamMemberDto(deletedTeamMember) : null;
    }
}