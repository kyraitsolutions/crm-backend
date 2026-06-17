// ORGANIZATION DTO
export class CreateOrganizationDto {
  firstName?: string;
  lastName?: string;
  name: string;
  email: string;
  slug: string;
  createdBy: string;
  website?: string;
  address?: {
    city: string;
    state: string;
    country: string;
    pincode: string;
    line1: string;
    line2: string;
  };
  industry?: string;
  phone?: string;
  privacyPolicy?: string;
  terms?: string;

  constructor(data: {
    name: string;
    email: string;
    slug: string;
    createdBy: string;
  }) {
    if (!data.name) throw new Error("Organization name is required");
    if (!data.email) throw new Error("Organization email is required");

    this.name = data.name;
    this.email = data.email;
    this.slug = data.slug;
    this.createdBy = data.createdBy;

    Object.assign(this, data);
  }
}

export class OrganizationResponseDto {
  id: string;
  name: string;

  constructor(data: { id: string; name: string }) {
    this.id = data.id;
    this.name = data.name;
  }
}

// ORGANIZATION MEMBERS DTO
export class CreateOrganizationMemberDto {
  userId: string;
  organizationId: string;
  invitedBy: string;
  isActive?: boolean;
  roleId: string;

  constructor(data: {
    userId: string;
    organizationId: string;
    invitedBy: string;
    isActive?: boolean;
    roleId: string;
  }) {
    if (!data.userId) throw new Error("userId is required");
    if (!data.organizationId) throw new Error("organizationId is required");
    if (!data.roleId) throw new Error("roleId is required");

    this.userId = data.userId;
    this.invitedBy = data.userId;
    this.isActive = data?.isActive;
    this.organizationId = data.organizationId;
    this.roleId = data.roleId;
  }
}

export class OrganizationMemberResponseDto {
  id: string;
  userId: string;
  accounts: any[];
  email: string;
  userProfile: {
    firstName?: string;
    lastName?: string;
  };
  role: {
    id: string;
    name: string;
  };
  status: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: OrganizationMemberResponseDto) {
    this.id = data.id;
    this.userId = data.userId;
    this.accounts = data.accounts;
    this.email = data.email;
    this.userProfile = data.userProfile;
    this.role = data.role;
    this.status = data.status;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}
