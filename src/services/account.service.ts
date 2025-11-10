import { EmailService } from './email.service';
import { TCreateAccount } from "./../types/account.type";
import { AccountDto, CreateAccountDto } from "../dtos/account.dto";
import { AccountRepository } from "../repositories/account.repository";

export class AccountService {
  private accountRepository: AccountRepository;
  private emailService: EmailService;

  constructor() {
    this.accountRepository = new AccountRepository();
    this.emailService = new EmailService();
  }

  async getAccountById(userId: string,accountId:string): Promise<{} | null> {
    const account= await this.accountRepository.findOne(userId,accountId);
    if(!account){
      return null;
    }
    return account;
  }

  async getAllAccounts(id: string): Promise<AccountDto[] | null> {
    const accounts = await this.accountRepository.findAll(id);
    return accounts?.map((account) => new AccountDto(account)) ?? [];
  }

  async createAccount(id: string, dto: CreateAccountDto): Promise<AccountDto> {
    let existingAccount = await this.accountRepository.findAccountByEmail(
      dto.email
    );

    if (existingAccount) {
      throw new Error("User with this email already exists");
    }

    const accountData: TCreateAccount = {
      userId: id,
      accountName: dto.accountName,
      email: dto.email,
      status: "active",
    };

    const account = await this.accountRepository.create(accountData);

    this.emailService.queueAccountCreationEmail(account?.email, account?.accountName)    
    
    return new AccountDto(account);
  }

  async deleteAccount(id: string): Promise<boolean | null> {
    return this.accountRepository.delete(id);
  }
}
