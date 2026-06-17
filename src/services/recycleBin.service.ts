import { AccountRepository } from "../repositories/account.repository";
import { UserAccountRepository } from "../repositories/user-account.repository";




export class RecyclebinService {
  constructor(
    private accountRepository: AccountRepository,
    private userAccountRepository: UserAccountRepository,
  ) {}

  async list(accountId: string): Promise<{} | null> {
    // const account = this.accountRepository.findOne(accountId);
    // if (!account) {
    //   throw new Error("Account not found");
    // }
    return accountId;
  }
}