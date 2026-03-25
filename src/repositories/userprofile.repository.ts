import { UserProfileModel } from "../models/userProfile.model.js";
import { TCreateUserProfile, TUserProfile } from "../types/userprofile.type.js";

export class UserProfileRepository {
  async findByUserId(id: string): Promise<TUserProfile | null> {
    return await UserProfileModel.findOne({ userId: id });
  }
  async create(data: TCreateUserProfile): Promise<TUserProfile> {
    return (await UserProfileModel.create(data)).toJSON();
  }

  async update(id: string, data: TCreateUserProfile): Promise<TUserProfile> {
    return (await UserProfileModel.updateOne(
      { userId: id },
      { $set: data },
      { new: true },
    )) as unknown as TUserProfile;
  }
}
