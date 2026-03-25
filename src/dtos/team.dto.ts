export class TeamMemberDto {
  id: string;
  userId: string;
  roleId: string;
  teamMemberId: string;
  firstName: string;
  lastName: string;
  email: string;
  // phone: string;
  inviteStatus: string;
  roleName: string;
  status: string;
  accountIds?: string[];
  createdAt: Date;
  updatedAt: Date;
  constructor(data: {
    _id: string;
    userId: string;
    teamMemberId: string;
    firstName: string;
    lastName: string;
    email: string;
    // phone: string;
    roleId: string;
    inviteStatus: string;
    accountIds?: string[];
    roleName: string;
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
    this.roleId = data.roleId;
    this.inviteStatus = data.inviteStatus;
    this.roleName = data.roleName;
    this.accountIds = data.accountIds;
    // this.phone = data.phone;
    this.status = data.status;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}

export class CreateTeamMemberDto {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  constructor(data: any) {
    if (!data?.firstName || !data?.email) {
      throw new Error("Missing required fields firstName and email");
    }

    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.email = data.email;
    this.phone = data.phone;
  }
}
