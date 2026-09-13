export class RecyclebinService {
  constructor() // private accountRepository: AccountRepository,
  // private userAccountRepository: UserAccountRepository,
  {}

  async list(accountId: string): Promise<{} | null> {
    // const account = this.accountRepository.findOne(accountId);
    // if (!account) {
    //   throw HttpError.notFound("Account not found");
    // }
    return accountId;
  }
}
