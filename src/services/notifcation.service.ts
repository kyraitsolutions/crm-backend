// import { AccountDto, CreateAccountDto } from "../dtos/account.dto.js";
import { AccountRepository } from "../repositories/account.repository.js";
import { TNotification } from "../types/notification.type.js";
import { NotificationRepository } from "../repositories/notification.repository.js";

export class NotificationService {
  constructor(
    private accountRepository: AccountRepository,
    private notificationRepository:NotificationRepository
  ) {}

  async getNotificationByAccountId(accountId: string): Promise<{} | null> {
    const account = this.accountRepository.findOne(accountId);
    if (!account) {
      throw new Error("Account not found");
    }
    return account;
  }
  async getAllNotifications(organizationId: string): Promise<TNotification[]> {
    return await this.notificationRepository.findAll(organizationId) || [];
  }

}
