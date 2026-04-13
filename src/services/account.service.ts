// import { AccountDto, CreateAccountDto } from "../dtos/account.dto.js";
import { ClientSession } from "mongoose";
import { AccountDto } from "../dtos/account.dto.js";
import { AccountRepository } from "../repositories/account.repository.js";
import { UserAccountRepository } from "../repositories/user-account.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { TUser } from "../types/user.type.js";
import { TAccount, TCreateAccount } from "./../types/account.type.js";
import { EmailService } from "./email.service.js";
import { RbacService } from "./rbac.service.js";
import { ROLES } from "../config/permissions.js";
import { TeamRepository } from "../repositories/team.repository.js";
import { console } from "inspector";

export class AccountService {
  constructor(
    private rbacService: RbacService,
    private accountRepository: AccountRepository,
    private userAccountRepository: UserAccountRepository,
    private teamRepository: TeamRepository,
    // private userRepository: UserRepository,
    // private emailService: EmailService,
  ) {}

  async getAccountById(accountId: string): Promise<{} | null> {
    const account = this.accountRepository.findOne(accountId);
    if (!account) {
      throw new Error("Account not found");
    }
    return account;
  }

  async getAllAccounts(user: TUser): Promise<AccountDto[] | []> {
    const role = await this.rbacService.getRoleById(user.role?.id as string);
    let accounts: TAccount[] | null = [];

    if (role?.name === ROLES.OWNER) {
      accounts = await this.accountRepository.findAll(user.id as string);
    } else {
      const teamMember =
        await this.userAccountRepository.getUserAccontsByUserId(
          user.id as string,
        );
      const accountIds = teamMember.map((acc: any) => acc.accountId);

      accounts = await this.accountRepository.findAccountsByIds(accountIds);
    }

    return accounts?.length ? accounts?.map((account) => account) : [];
  }

  async getAccountAccess(userId: string, accountId: string, role?: string) {
    if (role === ROLES.OWNER) {
      return {
        accountId,
        permissions: ["*"],
      };
    }

    // 1. Get account member
    const member = await this.userAccountRepository.getUserAccountByAccountId(
      userId,
      accountId,
    );

    if (!member) {
      throw new Error("Access denied to this account");
    }

    // 2. Get role
    const accountRole = await this.rbacService.getRoleById(
      member?.roleId as string,
    );

    let permissions: string[] = [];

    permissions = await this.rbacService.getPermissionsByRole(
      accountRole?.id as string,
    );

    return {
      accountId,
      // role: {
      //   id: role?.id,
      //   name: role.name,
      // },
      permissions,
    };
  }

  async createAccount(
    id: string,
    orgId: string,
    dto: Partial<TCreateAccount>,
    session?: ClientSession,
  ): Promise<TAccount | any> {
    let existingAccount = await this.accountRepository.findAccountByEmail(
      dto?.email as string,
    );

    if (existingAccount) {
      throw new Error("Account is already exists");
    }

    const accountData: TCreateAccount = {
      createdBy: id,
      organizationId: orgId,
      accountName: dto.accountName as string,
      email: dto.email as string,
      status: "active",
    };

    const account = await this.accountRepository.create(accountData, session);

    // this.emailService.queueAccountCreationEmail(
    //   account?.email,
    //   account?.accountName,
    // );

    return account;
  }

  async deleteAccount(id: string, user: any): Promise<boolean | null> {
    return this.accountRepository.delete(id);
  }
}
