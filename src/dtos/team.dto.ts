export class TeamMemberDto {
  id: string;
  userId: string;
  roleId: string;
  firstName: string;
  lastName?: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  accountIds: string[];

  constructor(data: any) {
    this.id = data.userId; // or orgMemberId if you have
    this.userId = data.userId;
    this.roleId = data.roleId || data.role;
    this.firstName = data.userprofile?.firstName || "";
    this.lastName = data.userprofile?.lastName || "";
    this.email = data.email;
    this.isActive = data.isActive;
    this.createdAt =
      data.createdAt?.toISOString?.() || new Date().toISOString();
    this.accountIds = data.accountIds || [];
  }
}

export class CreateTeamMemberDto {
  firstName: string;
  lastName?: string;
  email: string;
  roleId?: string;
  accounts?: {
    accountId: string;
    roleId: string;
  }[];

  constructor(data: {
    firstName: string;
    email: string;
    lastName?: string;
    roleId?: string;
    accounts?: {
      accountId: string;
      roleId: string;
    }[];
  }) {
    if (!data?.email) {
      throw new Error("Email is required");
    }
    if (!data?.firstName) {
      throw new Error("First name is required");
    }

    if (
      !data?.accounts?.length ||
      data?.accounts?.some((acc) => !acc.accountId && !acc.roleId)
    ) {
      throw new Error("Accounts are required wiht accountId and roleId");
    }

    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.email = data.email;
    this.roleId = data.roleId;
    this.accounts = data.accounts;
  }
}
