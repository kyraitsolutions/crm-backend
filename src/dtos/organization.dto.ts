// ORGANIZATION DTO
export class CreateOrganizationDto {
  private static readonly ALLOWED_FIELDS = [
    "firstName",
    "lastName",
    "name",
    "email",
    "slug",
    "createdBy",
    "website",
    "address",
    "industry",
    "phone",
    "privacyPolicy",
    "terms",
  ];

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

  constructor(data: CreateOrganizationDto) {
    const unknownFields = Object.keys(data).filter(
      (key) => !CreateOrganizationDto.ALLOWED_FIELDS.includes(key),
    );

    if (unknownFields.length) {
      throw new Error(`Unknown fields: ${unknownFields.join(", ")}`);
    }

    if (!data.firstName) throw new Error("firstName is required");
    if (!data.slug) throw new Error("Organization slug is required");
    if (!data.name) throw new Error("Organization name is required");
    if (!data.email) throw new Error("Organization email is required");

    this.name = data.name;
    this.email = data.email;
    this.slug = data.slug;
    this.createdBy = data.createdBy;

    Object.assign(this, data);
  }
}

export class CreateOrganizationResponseDto {
  id: string;
  name: string;
  createdAt?: Date;
  constructor(data: CreateOrganizationResponseDto) {
    this.id = data.id;
    this.name = data.name;
    this.createdAt = data.createdAt;
  }
}

export class OrganizationResponseDto {
  id: string;
  name: string;
  email: string;
  logo?: string;
  website?: string;
  industry?: string;
  size?: string;
  phone?: string;
  address?: {
    city: string;
    state: string;
    country: string;
    pincode: string;
    line1?: string;
    line2?: string;
  };
  createdBy: string;
  terms?: string;
  privacyPolicy?: string;

  createdAt: Date;
  updatedAt: Date;
  constructor(data: OrganizationResponseDto) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.logo = data.logo;
    this.website = data.website;
    this.industry = data.industry;
    this.size = data.size;
    this.phone = data.phone;
    this.createdBy = data.createdBy;
    this.terms = data.terms;
    this.privacyPolicy = data.privacyPolicy;

    if (data?.address && Object.keys(data.address).length > 0) {
      this.address = data.address;
    }
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
