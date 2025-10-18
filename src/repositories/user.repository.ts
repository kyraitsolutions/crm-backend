import { TCreateUser, TUpdateUser, TUser } from "../types";
import { RoleModel, UserModel } from "../models/user.model";

export class UserRepository {
  async findById(id: string): Promise<TUser | null> {
    // const users = await UserModel.aggregate([
    //   { $match: { _id: id } },
    //   {
    //     $lookup: {
    //       from: "roles",
    //       localField: "roleId",
    //       foreignField: "_id",
    //       as: "role",
    //     },
    //   },
    //   { $unwind: "$role" },
    //   {
    //     $project: {
    //       id: "$_id",
    //       email: 1,
    //       password: 1,
    //       firstName: 1,
    //       lastName: 1,
    //       googleId: 1,
    //       profilePicture: 1,
    //       createdAt: 1,
    //       updatedAt: 1,
    //       roleId: 1,
    //       role: "$role.name",
    //     },
    //   },
    // ]);
    // return users[0];
    console.log(id);
    return await UserModel.findOne({ _id: id });
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
