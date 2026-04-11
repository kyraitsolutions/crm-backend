import { ClientSession } from "mongoose";
import { AccountModel } from "../models/accounts.model.js";
import { TAccount, TCreateAccount } from "../types/account.type.js";

export class AccountRepository {
  async findAll(id: string): Promise<TAccount[] | null> {
    return await AccountModel.find({ createdBy: id });
  }
  async findAccountByEmail(email: string): Promise<TAccount | null> {
    return await AccountModel.findOne({ email });
  }

  async findAccountsByIds(accountIds: string[]): Promise<TAccount[] | null> {
    return await AccountModel.find({ _id: { $in: accountIds } });
  }
  async findOne(accountId: string): Promise<TAccount | null> {
    return await AccountModel.findOne({ _id: accountId }).select("-userId");
  }
  async create(
    data: TCreateAccount,
    session?: ClientSession,
  ): Promise<TAccount> {
    return (
      await AccountModel.create([data], { session })
    )[0].toJSON() as unknown as TAccount;
  }

  async delete(id: string): Promise<boolean | null> {
    return await AccountModel.findByIdAndDelete(id);
  }
}
