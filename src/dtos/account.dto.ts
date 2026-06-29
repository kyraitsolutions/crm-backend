export class AccountDto {
  id: string;
  createdBy: string;
  organizationId: string;
  accountName: string;
  email: string;
  status: string;
  createdAt: string;
  updatedAt: string;

  constructor(data: {
    id: string;
    createdBy: string;
    accountName: string;
    organizationId: string;
    email: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  }) {
    this.id = data.id;
    this.createdBy = data.createdBy;
    this.organizationId = data.organizationId;
    this.accountName = data.accountName;
    this.email = data.email;
    this.status = data.status;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}

export class CreateAccountDto {
  accountName: string;
  email: string;
  constructor(data: { accountName: string; email: string }) {
    const ALLOWED_FIELDS = ["accountName", "email"];

    const unknownFields = Object.keys(data).filter(
      (key) => !ALLOWED_FIELDS.includes(key),
    );

    if (unknownFields.length) {
      throw new Error(`Unknown fields: ${unknownFields.join(", ")}`);
    }

    if (!data.accountName)
      throw new Error("Account name is required (accountName)");
    if (!data.email) throw new Error("Email is required (email)");

    this.accountName = data.accountName;
    this.email = data.email;
  }
}

export class CreateAccountResponseDto {
  id: string;
  accountName: string;
  email: string;

  constructor(data: { id: string; accountName: string; email: string }) {
    this.id = data.id;
    this.accountName = data.accountName;
    this.email = data.email;
  }
}

export class AccountAccessDto {
  accountId: string;
  permissions: string[];

  constructor(data: { accountId: string; permissions: string[] }) {
    this.accountId = data.accountId;
    this.permissions = data.permissions;
  }
}
