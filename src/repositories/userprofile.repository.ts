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
    return userProfile[0].toJSON();
  }
  async update(
    id: string,
    data: Partial<TUserProfile>,
    session?: ClientSession,
  ): Promise<TUserProfile | null> {
    return await UserProfileModel.updateOne(
      { userId: id },
      { $set: data },
      { new: true, session },
    ).lean();
  }
  async delete(id: string): Promise<boolean> {
    return await UserProfileModel.deleteOne({ userId: id }).lean();
  }
}
