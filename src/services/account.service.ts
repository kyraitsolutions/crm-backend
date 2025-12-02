import { TeamRepository } from './../repositories/team.repository';
import { EmailService } from './email.service';
import { TCreateAccount } from "./../types/account.type";
import { AccountDto, CreateAccountDto } from "../dtos/account.dto";
import { AccountRepository } from "../repositories/account.repository";
import { USERROLE } from '../enums/user.enum';
import { ObjectId } from "mongodb";
export class AccountService {
  private accountRepository: AccountRepository;
  private teamRepository: TeamRepository;
  private emailService: EmailService;

  constructor() {
    this.accountRepository = new AccountRepository();
    this.teamRepository = new TeamRepository();
    this.emailService = new EmailService();
  }

  async getAccountById(userId: string,accountId:string): Promise<{} | null> {
    const account= await this.accountRepository.findOne(userId,accountId);
    if(!account){
      throw new Error("Account not found");
    }
    return account;
  }

  async getAllAccounts(user:any): Promise<AccountDto[] | null> {

    const isAdmin = new ObjectId(USERROLE.ADMIN).equals(user.roleId);
    const isTeamMember = new ObjectId(USERROLE.TEAM_MEMBER).equals(user.roleId);
    
    let accounts:any=[]
    
    if(isAdmin){
      accounts = await this.accountRepository.findAll(user.id);
    }
    else if(isTeamMember){
      const teamMember = await this.teamRepository.getAccountsByTeamMember(user.id);

      let AccountIds=teamMember.map((acc:any)=>acc.accountId);
      accounts = await this.accountRepository.findAccountsByIds(AccountIds);
    }
    return accounts?.map((account) => new AccountDto(account)) ?? [];
  }

  async createAccount(id: string, dto: CreateAccountDto): Promise<AccountDto|any> {
    let existingAccount = await this.accountRepository.findAccountByEmail(
      dto.email
    );

    if (existingAccount) {
      return {messgae:"Account with this email exist already",isExist:true}
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
