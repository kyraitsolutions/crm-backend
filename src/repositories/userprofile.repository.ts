import { CreateUserProfileDto } from "../dtos/userprofile.dto.js";
import { TUserDocument } from "../models/user.model.js";
import { UserProfileModel } from "../models/userProfile.model.js";
import { TCreateUserProfile, TUserProfile } from "../types/userprofile.type.js";

export class UserProfileRepository {
  async findByUserId(id: string): Promise<TUserDocument | null> {
    return await UserProfileModel.findOne({ userId: id });
  }
  async create(data: CreateUserProfileDto): Promise<TUserDocument | null> {
    return (await UserProfileModel.create(data)).toJSON();
  }

  async update(
    id: string,
    data: TCreateUserProfile,
  ): Promise<TUserDocument | null> {
    return await UserProfileModel.updateOne(
      { userId: id },
      { $set: data },
      { new: true },
    ).lean();
  }
}
