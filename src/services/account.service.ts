import { TeamRepository } from "./../repositories/team.repository.js";
import { EmailService } from "./email.service.js";
import { TCreateAccount } from "./../types/account.type.js";
import { AccountDto, CreateAccountDto } from "../dtos/account.dto.js";
import { AccountRepository } from "../repositories/account.repository.js";
import { USERROLE } from "../enums/user.enum.js";
import { ObjectId } from "mongodb";
import { ROLE_PERMISSIONS } from "../rbac/role-permissions.js";
import { hasPermission } from "../rbac/hasPermission.js";
export class AccountService {
  private accountRepository: AccountRepository;
  private teamRepository: TeamRepository;
  private emailService: EmailService;

  constructor() {
    this.accountRepository = new AccountRepository();
    this.teamRepository = new TeamRepository();
    this.emailService = new EmailService();
  }

  async getAccountById(userId: string, accountId: string): Promise<{} | null> {
    const account = await this.accountRepository.findOne(userId, accountId);
    if (!account) {
      throw new Error("Account not found");
    }
    return account;
  }

  async getAllAccounts(user: any): Promise<AccountDto[] | null> {
    const role = user.roleId.toString() as USERROLE;
    const permissions = ROLE_PERMISSIONS[role];

    const hasPermissions = hasPermission(permissions, "account:view");

    if (!hasPermissions) {
      throw new Error("You don't have permission to view accounts");
    }

    let accounts: any = [];

    console.log(permissions);

    if (permissions.includes("*")) {
      accounts = await this.accountRepository.findAll(user.id);
    } else {
      const teamMember = await this.teamRepository.getAccountsByTeamMember(
        user.id,
      );

      const accountIds = teamMember.map((acc: any) => acc.accountId);

      accounts = await this.accountRepository.findAccountsByIds(accountIds);
    }

    return accounts.map((account: any) => new AccountDto(account));

    // if (isAdmin) {
    //   accounts = await this.accountRepository.findAll(user.id);
    // } else if (isTeamMember) {
    //   const teamMember = await this.teamRepository.getAccountsByTeamMember(
    //     user.id,
    //   );

    //   let AccountIds = teamMember.map((acc: any) => acc.accountId);
    //   accounts = await this.accountRepository.findAccountsByIds(AccountIds);
    // }
    // return accounts?.map((account: any) => new AccountDto(account)) ?? [];
  }

  async createAccount(
    id: string,
    dto: CreateAccountDto,
  ): Promise<AccountDto | any> {
    let existingAccount = await this.accountRepository.findAccountByEmail(
      dto.email,
    );

    if (existingAccount) {
      return {
        messgae: "Account with this email exist already",
        isExist: true,
      };
    }

    const accountData: TCreateAccount = {
      userId: id,
      accountName: dto.accountName,
      email: dto.email,
      status: "active",
    };

    const account = await this.accountRepository.create(accountData);

    this.emailService.queueAccountCreationEmail(
      account?.email,
      account?.accountName,
    );

    return new AccountDto({ ...account, _id: account.id });
  }

  async deleteAccount(id: string, user: any): Promise<boolean | null> {
    const role = user.roleId.toString() as USERROLE;
    const permissions = ROLE_PERMISSIONS[role];

    const hasPermissions = hasPermission(permissions, "account:delete");

    if (!hasPermissions) {
      throw new Error("You don't have permission to delete accounts");
    }

    return this.accountRepository.delete(id);
  }
}
