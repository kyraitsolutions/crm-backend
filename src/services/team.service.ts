import { CreateTeamMemberDto, TeamMemberDto } from "../dtos/team.dto.js";
import { RoleModel } from "../models/user.model.js";
import { UserRepository } from "../repositories/user.repository.js";
import { TeamRepository } from "../repositories/team.repository.js";
import { UserProfileRepository } from "../repositories/userprofile.repository.js";
import { TCreateUserProfile } from "../types/userprofile.type.js";
import { EmailService } from "./email.service.js";

export class TeamService {
  private teamRepository: TeamRepository;
  private userRepository: UserRepository;
  private emailService: EmailService;
  private userprofileRepository: UserProfileRepository;
  constructor() {
    this.userRepository = new UserRepository();
    this.emailService = new EmailService();
    this.teamRepository = new TeamRepository();
    this.userprofileRepository = new UserProfileRepository();
  }
  async getTeamMembers(orgId: string): Promise<any[]> {
    const teamMembers = await this.teamRepository.getTeamMembers(orgId);
    return (
      teamMembers?.map((teamMember: any) => new TeamMemberDto(teamMember)) ?? []
    );
  }
  async getTeamMemberById(id: string): Promise<any> {
    const teamMember = await this.teamRepository.getTeamMemberById(id);
    return teamMember ? new TeamMemberDto(teamMember) : null;
  }
  async createTeamMember(
    orgId: string,
    teamMember: CreateTeamMemberDto
  ): Promise<any> {
    // user create
    const newTeamMember = await this.userRepository.createTeamUser(
      teamMember.email
    );

    // user profile
    const onboardingData: TCreateUserProfile = {
      userId: newTeamMember._id,
      firstName: teamMember.firstName,
      lastName: teamMember.lastName,
      organizationName: "",
      accountType: "individual",
    };

    const newOnboarding = await this.userprofileRepository.create(
      onboardingData
    );

    const role = await RoleModel.findOne({ name: "TEAM_MEMBER" });
    if (!role) throw new Error("Role not found");
    // team member create
    const teamMemberData = {
      orgId: orgId,
      userId: newTeamMember._id,
      roleId: role?._id,
      status: true,
      inviteStatus: "PENDING",
    };

    const createdTeamMember = await this.teamRepository.createTeamMember(
      teamMemberData
    );

    // call email service to send invitation email
    const url = `${process.env.FRONTEND_URL}/login`;
    this.emailService.queueWelcomeEmail(teamMember.email, url);

    // return createdTeamMember ? new TeamMemberDto(createdTeamMember) : null;
    // return null;
    return new TeamMemberDto({
      _id: createdTeamMember._id.toString(),
      teamMemberId: createdTeamMember._id.toString(),
      userId: newTeamMember._id.toString(),
      roleId: role._id.toString(),
      firstName: newOnboarding.firstName,
      lastName: newOnboarding.lastName,
      email: newTeamMember.email,
      inviteStatus: createdTeamMember.inviteStatus,
      roleName: role.name!,
      status: createdTeamMember.status ? "ACTIVE" : "INACTIVE",
      accountIds: [],
      createdAt: createdTeamMember.createdAt,
      updatedAt: createdTeamMember.updatedAt,
    });
  }
  async updateTeamMember(id: string, teamMember: any): Promise<any> {
    const updatedTeamMember = await this.teamRepository.updateTeamMember(
      id,
      teamMember
    );
    return updatedTeamMember ? new TeamMemberDto(updatedTeamMember) : null;
  }
  async deleteTeamMember(id: string): Promise<any> {
    const deletedTeamMember = await this.teamRepository.deleteTeamMember(id);
    return deletedTeamMember ? new TeamMemberDto(deletedTeamMember) : null;
  }

  async assignAccountToMember(
    memberId: string,
    accountIds: any,
    leadId: string
  ): Promise<any> {
    const assignment = await this.teamRepository.assignAccountToMember(
      memberId,
      accountIds,
      leadId
    );
    return assignment;
  }
}
