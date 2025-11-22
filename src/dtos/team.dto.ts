export class TeamMemberDto {
    id: string;
    userId: string;
    teamMemberId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    constructor(data: {
        _id: string;
        userId: string;
        teamMemberId: string;
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
    }) {
        this.id = data._id;
        this.userId = data.userId;
        this.teamMemberId = data.teamMemberId;
        this.firstName = data.firstName;
        this.lastName = data.lastName;
        this.email = data.email;
        this.phone = data.phone;
        this.status = data.status;
        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
    }
}

export class CreateTeamMemberDto {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    constructor(data: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
    }) {
        this.firstName = data.firstName;
        this.lastName = data.lastName;
        this.email = data.email;
        this.phone = data.phone;
    }
}