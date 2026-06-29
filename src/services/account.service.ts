// import { AccountDto, CreateAccountDto } from "../dtos/account.dto.js";
import { ClientSession } from "mongoose";
import { ROLES } from "../config/permissions.js";
import {
  AccountAccessDto,
  AccountDto,
  CreateAccountDto,
  CreateAccountResponseDto,
} from "../dtos/account.dto.js";
import { AccountRepository } from "../repositories/account.repository.js";
// import { TeamRepository } from "../repositories/team.repository.js";
import { UserAccountRepository } from "../repositories/user-account.repository.js";
import {
  TApiResponse,
  TPaginatedResponse,
} from "../types/api-response.type.js";
import { TUser } from "../types/user.type.js";
import { TAccount, TCreateAccount } from "./../types/account.type.js";
import { RbacService } from "./rbac.service.js";
import { TRole } from "../types/roles-permissions.type.js";

export class AccountService {
  constructor(
    private rbacService: RbacService,
    private accountRepository: AccountRepository,
    private userAccountRepository: UserAccountRepository,
    // private teamRepository: TeamRepository,
    // private userRepository: UserRepository,
    // private emailService: EmailService,
  ) {}

  async getAccountById(accountId: string): Promise<TApiResponse<AccountDto>> {
    if (!accountId) throw new Error("Account id is required");

    const account = await this.accountRepository.findOne(accountId);

    if (!account) {
      throw new Error("Account not found");
    }
    console.log("account", new AccountDto(account));
    return {
      doc: new AccountDto(account),
    };
  }

  async getAllAccounts(
    user: TUser,
    role: TRole,
  ): Promise<TPaginatedResponse<AccountDto>> {
    // const role = await this.rbacService.getRoleById(user.role?.id as string);
    let accounts: TAccount[] | null = [];
    // let totalDocs = null;

    if (role?.name === ROLES.OWNER) {
      const [fetchedAccounts] = await Promise.all([
        this.accountRepository.findAll(user.id as string),
        // this.accountRepository.countDocuments({
        //   createdBy: user.id as string,
        // }),
      ]);

      accounts = fetchedAccounts ?? [];
      // totalDocs = docsCount;

      // accounts = await this.accountRepository.findAll(user.id as string);
      // docsCount = await this.accountRepository.countDocuments({
      //   createdBy: user.id as string,
      // });
    } else {
      const teamMember =
        await this.userAccountRepository.getUserAccontsByUserId(
          user.id as string,
        );
      const accountIds = teamMember.map((acc: any) => acc.accountId);
      accounts = await this.accountRepository.findAccountsByIds(accountIds);
    }

    return {
      docs: accounts?.length ? accounts?.map((account) => account) : [],
    };
  }

  async getAccountAccess(
    userId: string,
    accountId: string,
    role?: string,
  ): Promise<TApiResponse<AccountAccessDto>> {
    if (!accountId) throw new Error("Account id is required");

    const account = await this.accountRepository.findOne(accountId);

    if (!account) {
      throw new Error("Account not found");
    }

    if (role === ROLES.OWNER) {
      return {
        doc: {
          accountId: accountId,
          permissions: ["*"],
        },
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

    const { docs } = await this.rbacService.getPermissionsByRole(
      accountRole?.id as string,
    );

    permissions = docs;

    return {
      doc: {
        accountId,
        // role: {
        //   id: role?.id,
        //   name: role.name,
        // },
        permissions,
      },
    };
  }

  async createAccount(
    id: string,
    orgId: string,
    dto: CreateAccountDto,
    session?: ClientSession,
  ): Promise<TApiResponse<CreateAccountResponseDto>> {
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

    return {
      doc: new CreateAccountResponseDto(account),
    };
  }

  async deleteAccount(id: string): Promise<TApiResponse<{ id: string }>> {
    const account = await this.accountRepository.findOne(id);
    if (!account) {
      throw new Error("Account not found");
    }

    const result = await this.accountRepository.delete(id);

    return {
      doc: { id: String(result?.id) },
    };
  }
}
