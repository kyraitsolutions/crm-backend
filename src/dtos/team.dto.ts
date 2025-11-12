export class TeamMemberDto {
    id: string;
    userId: string;
    teamMemberId: string;
    accountsId: string[];
    teamMemberName: string;
    teamMemberEmail: string;
    teamMemberPhone: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    constructor(data: {
        _id: string;
        userId: string;
        teamMemberId: string;
        accountsId: string[];
        teamMemberName: string;
        teamMemberEmail: string;
        teamMemberPhone: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
    }) {
        this.id = data._id;
        this.userId = data.userId;
        this.teamMemberId = data.teamMemberId;
        this.accountsId = data.accountsId;
        this.teamMemberName = data.teamMemberName;
        this.teamMemberEmail = data.teamMemberEmail;
        this.teamMemberPhone = data.teamMemberPhone;
        this.status = data.status;
        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
    }
}

export class CreateTeamMemberDto {
    teamMemberName: string;
    teamMemberEmail: string;
    teamMemberPhone: string;
    constructor(data: {
        teamMemberName: string;
        teamMemberEmail: string;
        teamMemberPhone: string;
    }) {
        this.teamMemberName = data.teamMemberName;
        this.teamMemberEmail = data.teamMemberEmail;
        this.teamMemberPhone = data.teamMemberPhone;
    }
}