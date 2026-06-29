import { ClientSession, FilterQuery } from "mongoose";
import { AccountModel } from "../models/accounts.model.js";
import { TAccount, TCreateAccount } from "../types/account.type.js";
import { TApiResponse } from "../types/api-response.type.js";

export class AccountRepository {
  async countDocuments(filter: FilterQuery<TAccount>): Promise<number> {
    return AccountModel.countDocuments(filter);
  }
  async findAll(id: string): Promise<TAccount[] | null> {
    const accounts = await AccountModel.find({ createdBy: id });
    return accounts.map((account) => account.toJSON());
  }
  async findAccountByEmail(email: string): Promise<TAccount | null> {
    const account = await AccountModel.findOne({ email });
    return account ? account.toJSON() : null;
  }

  async findAccountsByIds(accountIds: string[]): Promise<TAccount[] | null> {
    const accounts = await AccountModel.find({ _id: { $in: accountIds } });
    return accounts.map((account) => account.toJSON());
  }
  async findOne(accountId: string): Promise<TAccount | null> {
    const account = await AccountModel.findOne({ _id: accountId });
    return account ? account.toJSON() : null;
  }
  async create(
    data: TCreateAccount,
    session?: ClientSession,
  ): Promise<TAccount> {
    return (
      await AccountModel.create([data], { session })
    )[0].toJSON() as unknown as TAccount;
  }

  async delete(id: string): Promise<TAccount | null> {
    const result = await AccountModel.findByIdAndDelete(id);
    return result ? result.toJSON() : null;
  }
}
