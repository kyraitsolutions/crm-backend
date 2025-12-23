import { AccountModel } from "../models/accounts.model";
import { TAccount, TCreateAccount } from "../types/account.type";

export class AccountRepository {
  async findAll(id: string): Promise<TAccount[] | null> {
    return await AccountModel.find({ userId: id });
  }

  async findAccountByEmail(email: string): Promise<TAccount | null> {
    return await AccountModel.findOne({ email });
  }
  async findOne(userId: string, accountId: string): Promise<TAccount | null> {
    return await AccountModel.findOne({ userId, _id: accountId });
  }

  async create(data: TCreateAccount): Promise<TAccount> {
    return await AccountModel.create(data) as unknown as TAccount;
  }

  async delete(id: string): Promise<boolean | null> {
    return await AccountModel.findByIdAndDelete(id);
  }

  async findAccountsByIds(accountIds: string[]): Promise<TAccount[] | null> {
    return await AccountModel.find({ _id: { $in: accountIds } });
  }
}
