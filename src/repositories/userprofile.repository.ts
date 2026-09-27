import { ClientSession } from "mongoose";
import { UserProfileModel } from "../models/userProfile.model.js";
import { TUser, TUserProfile } from "../types/user.type.js";

export class UserProfileRepository {
  async findByUserId(id: string): Promise<TUser | null> {
    return await UserProfileModel.findOne({ userId: id });
  }
  async create(
    data: Partial<TUserProfile>,
    session?: ClientSession,
  ): Promise<TUserProfile> {
    const userProfile = await UserProfileModel.create([{ ...data }], {
      session,
    });
    return userProfile[0].toJSON() as unknown as TUserProfile;
  }
  async update(
    id: string,
    data: Partial<TUserProfile>,
    session?: ClientSession,
  ): Promise<TUserProfile | null> {
    const updated = await UserProfileModel.findOneAndUpdate(
      { userId: id },
      { $set: data },
      { new: true, session },
    ).lean();
    return updated as unknown as TUserProfile | null;
  }
  async delete(id: string): Promise<boolean> {
    const result = await UserProfileModel.deleteOne({ userId: id });
    return result.deletedCount > 0;
  }

  async deleteByUserIds(
    userIds: string[],
    session?: ClientSession,
  ): Promise<void> {
    await UserProfileModel.deleteMany({
      userId: { $in: userIds },
    }).session(session || null);
  }
}
