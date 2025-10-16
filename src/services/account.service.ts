import { TCreateAccount } from './../types/account.type';
import { AccountDto, CreateAccountDto } from "../dtos/account.dto";
import { AccountRepository } from "../repositories/account.repository";

export class AccountService{
    private accountRepository:AccountRepository;

    constructor(){
        this.accountRepository=new AccountRepository();
    }

    async getAllAccounts(id:string):Promise<{} | null>{
        const accounts=await this.accountRepository.findAll(id);
        return accounts;
    }

    async createAccount(id:string,dto:CreateAccountDto):Promise<AccountDto>{
        let existingAccount=await this.accountRepository.findAccountByEmail(dto.email);

        if(existingAccount){
            throw new Error("User with this email already exists");
        }

        const accountData: TCreateAccount={
            userId:id,
            accountName:dto.accountName,
            email:dto.email,
            status:"active"
        };

        const account=await this.accountRepository.create(accountData);
        return new AccountDto(account);
    }

    async deleteAccount(id:string):Promise<boolean | null>{
        return this.accountRepository.delete(id);
    }
}