import { AccountDto, CreateAccountDto } from "../dtos/account.dto.js";
import { RoleModel } from "../models/user.model.js";
import { AccountRepository } from "../repositories/account.repository.js";
import { TeamRepository } from "./../repositories/team.repository.js";
import { TAccount, TCreateAccount } from "./../types/account.type.js";
import { EmailService } from "./email.service.js";
export class AccountService {
  private accountRepository: AccountRepository;
  private teamRepository: TeamRepository;
  private emailService: EmailService;

  constructor() {
    this.accountRepository = new AccountRepository();
    this.teamRepository = new TeamRepository();
    this.emailService = new EmailService();
  }

  async getAccountById(accountId: string): Promise<{} | null> {
    const account = await this.accountRepository.findOne(accountId);
    if (!account) {
      throw new Error("Account not found");
    }
    return account;
  }

  async getAllAccounts(user: any): Promise<AccountDto[]> {
    const roleId = user.roleId;
    const role = await RoleModel.findById(roleId);

    let accounts: TAccount[] | null = [];

    if (role?.name === "ADMIN") {
      accounts = await this.accountRepository.findAll(user.id);
    } else {
      const teamMember = await this.teamRepository.getAccountsByTeamMember(
        user.id,
      );

      const accountIds = teamMember.map((acc: any) => acc.accountId);

      accounts = await this.accountRepository.findAccountsByIds(accountIds);
    }

    return accounts?.map(
      (account: any) => new AccountDto(account),
    ) as AccountDto[];
  }

  async createAccount(
    id: string,
    orgId: string,
    dto: CreateAccountDto,
  ): Promise<AccountDto | any> {
    let existingAccount = await this.accountRepository.findAccountByEmail(
      dto.email,
    );

    if (existingAccount) {
      throw new Error("Account is already exists");
    }

    const accountData: TCreateAccount = {
      createdBy: id,
      organizationId: orgId,
      accountName: dto.accountName,
      email: dto.email,
      status: "active",
    };

    const account = await this.accountRepository.create(accountData);

    this.emailService.queueAccountCreationEmail(
      account?.email,
      account?.accountName,
    );

    return new AccountDto(account);
  }

  async deleteAccount(id: string, user: any): Promise<boolean | null> {
    // const role = user.roleId.toString() as USERROLE;
    // const permissions = ROLE_PERMISSIONS[role];

    // const hasPermissions = hasPermission(permissions, "account:delete");

    // if (!hasPermissions) {
    //   throw new Error("You don't have permission to delete accounts");
    // }

    return this.accountRepository.delete(id);
  }
}
