import { AccountModel } from "../models/accounts.model";
import { TAccount, TCreateAccount } from "../types/account.type";


export class AccountRepository{
    async findAll(id:string):Promise<TAccount[] | null>{
        return await AccountModel.find({'userId':id});
    }

    async findAccountByEmail(email:string):Promise<TAccount |null>{
        return await AccountModel.findOne({email})
    }
    async findOne(id:string):Promise<TAccount |null>{
        return await AccountModel.findOne({userId:id})
    }


    async create(data:TCreateAccount):Promise<TAccount | null>{
        return await AccountModel.create(data);
    }

    async delete(id:string):Promise<boolean | null>{
        return await AccountModel.findByIdAndDelete(id);
    }
}