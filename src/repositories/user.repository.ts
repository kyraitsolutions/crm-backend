import mongoose, { ClientSession } from "mongoose";
import { RoleModel, UserModel } from "../models/user.model.js";
import { TUser } from "../types/user.type.js";

export class UserRepository {
  async findRole(name: string): Promise<{ name: string; _id: string } | null> {
    return await RoleModel.findOne({ name });
  }
  async findRoleById(
    id: string,
  ): Promise<{ name: string; _id: string } | null> {
    return await RoleModel.findOne({ _id: id });
  }
  async findAll(): Promise<TUser[]> {
    return await UserModel.find();
  }
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
        $addFields: {
          id: "$_id",
        },
      },
      {
        $project: {
          _id: 0,
          id: 1,
          email: 1,
          onboarding: 1,
          createdAt: 1,
          updatedAt: 1,
          roleId: 1,
          userprofile: {
            profilePicture: "$userprofile.profilePicture",
            firstName: "$userprofile.firstName",
            lastName: "$userprofile.lastName",
            phone: "$userprofile.phone",
            address: "$userprofile.address",
          },
        },
      },
      // {
      //   $lookup: {
      //     from: "usersubscriptions",
      //     localField: "_id",
      //     foreignField: "userId",
      //     as: "usersubscription",
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$usersubscription",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },
      // {
      // $project: {
      //   _id: 1,
      //   email: 1,
      //   onboarding: 1,
      //   createdAt: 1,
      //   updatedAt: 1,
      //   roleId: 1,
      //   userprofile: 1,
      // }
      // },
    ]);

    // Return single object if found
    return user[0] ? user[0] : null;
    // return await UserModel.findOne({ _id: id });
  }
  async findByEmail(email: string): Promise<TUser | null> {
    const user = await UserModel.findOne({ email: email });
    return user ? user.toJSON() : null;
  }
  async findByGoogleId(googleId: string): Promise<TUser | null> {
    const user = await UserModel.findOne({ googleId });
    return user ? user.toJSON() : null;
  }
  async create(data: Partial<TUser>, session?: ClientSession): Promise<TUser> {
    // const role = await RoleModel.findOne({ name: "ADMIN" });
    const user = await UserModel.create([{ ...data }], { session });
    return user[0].toJSON();
  }
  async update(
    id: string,
    data: Partial<TUser>,
    session?: ClientSession,
  ): Promise<TUser | null> {
    return await UserModel.findByIdAndUpdate(id, data, { new: true, session });
  }
  async delete(id: string): Promise<boolean> {
    const result = await UserModel.findByIdAndDelete(id);
    return !!result;
  }
}
