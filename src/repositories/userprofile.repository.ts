import { UserProfileModel } from "../models/userProfile.model";
import { TCreateUserProfile, TUserProfile } from "../types/userprofile.type";

export class UserProfileRepository{

    async findByUserId(id:string):Promise<TUserProfile | null>{
        return await UserProfileModel.findOne({userId:id})
    }
    async create(data:TCreateUserProfile):Promise<TUserProfile>{
        return await UserProfileModel.create(data)
    }
}