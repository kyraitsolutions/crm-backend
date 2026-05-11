// import { AccountDto, CreateAccountDto } from "../dtos/account.dto.js";
import { AccountRepository } from "../repositories/account.repository.js";
import { UserAccountRepository } from "../repositories/user-account.repository.js";
import { TUser } from "../types/user.type.js";
import { RbacService } from "./rbac.service.js";
import { ROLES } from "../config/permissions.js";
import { TCreateNotification } from "../types/notification.type.js";

export class NotificationService {
  constructor(
    private rbacService: RbacService,
    private accountRepository: AccountRepository,
    private userAccountRepository: UserAccountRepository,
    // private userRepository: UserRepository,
    // private emailService: EmailService,
  ) {}

  async getNotificationByAccountId(accountId: string): Promise<{} | null> {
    const account = this.accountRepository.findOne(accountId);
    if (!account) {
      throw new Error("Account not found");
    }
    return account;
  }

  async getAllNotifications(user: TUser): Promise<[]> {
  
    return  [];
  }

  async createNotication(data:TCreateNotification):Promise<{}|null>{
    return {}
  }

}
