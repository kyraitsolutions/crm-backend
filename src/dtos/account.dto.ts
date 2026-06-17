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
    this.accountName = data.accountName;
    this.email = data.email;
  }
}
