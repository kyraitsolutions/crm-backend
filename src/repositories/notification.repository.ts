import { ClientSession } from "mongoose";
import { TAccount, TCreateAccount } from "../types/account.type.js";
import { Notification } from "../models/notification.model.js";

export class NotificationRepository {
  async findAll(id: string): Promise<TAccount[] | null> {
    return await Notification.find({ createdBy: id });
  }
  async findAccountByEmail(email: string): Promise<TAccount | null> {
    return await Notification.findOne({ email });
  }

  async findAccountsByIds(accountIds: string[]): Promise<TAccount[] | null> {
    return await Notification.find({ _id: { $in: accountIds } });
  }
  async findOne(accountId: string): Promise<TAccount | null> {
    return await Notification.findOne({ _id: accountId }).select("-userId");
  }
  async create(
    data: TCreateAccount,
    session?: ClientSession,
  ): Promise<TAccount> {
    return (
      await Notification.create([data], { session })
    )[0].toJSON() as unknown as TAccount;
  }

  async delete(id: string): Promise<boolean | null> {
    return await Notification.findByIdAndDelete(id);
  }
}
