import { TCreateUser, TUpdateUser, TUser } from "../types/user.type.js";
import { RoleModel, UserModel } from "../models/user.model.js";
import mongoose from "mongoose";

export class UserRepository {
  async findById(id: string): Promise<TUser | null> {
    const user = await UserModel.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(id) },
      },
      {
        $lookup: {
          from: "userprofiles", // collection name is plural by default
          localField: "_id",
          foreignField: "userId",
          as: "userprofile",
        },
      },
      {
        $unwind: {
          path: "$userprofile",
          preserveNullAndEmptyArrays: true, // if user doesn't have profile
        },
      },
      {
        $lookup:{
          from:"usersubscriptions",
          localField:"_id",
          foreignField:"userId",
          as:"usersubscription"
        }
      },
      {
        $unwind:{
          path:"$usersubscription",
          preserveNullAndEmptyArrays: true,
        }
      },
      {
        $project: {
          _id: 1,
          email: 1,
          password: 1,
          googleId: 1,
          onboarding: 1,
          profilePicture: 1,
          createdAt: 1,
          updatedAt: 1,
          roleId: 1,
          "userprofile.firstName": 1,
          "userprofile.lastName": 1,
          "userprofile.organizationName": 1,
          "userprofile.accountType": 1,
          "usersubscription.planId":1,
        },
      },
    ]);

    // Return single object if found
    return user[0] || null;
    // return await UserModel.findOne({ _id: id });
  }

  async findByEmail(email: string): Promise<TUser | null> {
    return await UserModel.findOne({ email });
  }

  async findByGoogleId(googleId: string): Promise<TUser | null> {
    return await UserModel.findOne({ googleId });
  }

  async create(data: TCreateUser): Promise<TUser> {
    const role = await RoleModel.findOne({ name: "ADMIN" });
    return await UserModel.create({ ...data, roleId: role?._id });
  }

  async createTeamUser(email:any): Promise<any> {
    const role = await RoleModel.findOne({ name: "ACCOUNT_MANAGER" });
    return await UserModel.create({email:email, roleId: role?._id, onboarding:true });
    // return null;
  }

  async update(id: string, data: TUpdateUser): Promise<TUser | null> {
    return await UserModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id: string): Promise<boolean> {
    const result = await UserModel.findByIdAndDelete(id);
    return !!result;
  }

  async findAll(): Promise<TUser[]> {
    return await UserModel.find();
  }
}
