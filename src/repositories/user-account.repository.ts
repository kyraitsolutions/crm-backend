import { ClientSession } from "mongoose";
import { UserAccount } from "../models/user.accounts.model.js";

export class UserAccountRepository {
  async bulkInsert(data: any[], session?: ClientSession) {
    return UserAccount.insertMany(data, { session });
  }

  async findByUser(userId: string) {
    return UserAccount.find({ userId });
  }

  async getUserAccountByAccountId(userId: string, accountId: string) {
    return UserAccount.findOne({ userId, accountId });
  }

  async getUserAccontsByUserId(userId: string): Promise<any[]> {
    const assignments = await UserAccount.find({
      userId: userId,
    });
    return assignments;
  }

  async deleteByUserAndOrg(userId: string, orgId: string) {
    return UserAccount.deleteMany({
      userId,
      organizationId: orgId,
    });
  }

  async deleteByUserIds(
    userIds: string[],
    session?: ClientSession,
  ): Promise<void> {
    await UserAccount.deleteMany({
      userId: { $in: userIds },
    }).session(session || null);
  }
}
