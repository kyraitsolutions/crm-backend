import { ClientSession, Types } from "mongoose";
import { PermissionModel } from "../models/permissions.model";
import { RolePermissionModel } from "../models/role-permissions";
import { RoleModel } from "../models/role.model";
import {
  TPermission,
  TRole,
  TRolePermission,
} from "../types/roles-permissions.type";
import { ROLES } from "../config/permissions";

export class RbacRepository {
  // ROLES RELATED REPOSITORIES
  async getRoleById(roleId: string): Promise<TRole | null> {
    const role = await RoleModel.findById(roleId);
    return role ? role.toJSON() : null;
  }
  async getRoleByOrgIdAndName(
    orgId: string,
    name: string,
  ): Promise<TRole | null> {
    const role = await RoleModel.findOne({ organizationId: orgId, name });

    return role ? role.toJSON() : null;
  }
  async getRolesByOrganization(
    orgId: string,
    level?: number,
  ): Promise<TRole[]> {
    console.log("level", level);
    const roles = await RoleModel.find({
      organizationId: orgId,
      name: { $ne: ROLES.OWNER },
      ...(level && { level: { $lte: level } }),
    });

    return roles.map((r) => r.toJSON());
  }
  async createRoles(data: Partial<TRole>[], session?: ClientSession) {
    const createdRoles = await RoleModel.insertMany(data, {
      ordered: false,
      session,
    });

    return createdRoles;
  }

  async updateRoleById(
    roleId: string,
    data: Partial<TRole>,
    session?: ClientSession,
  ) {
    console.log("data", data);
    console.log("roleId", roleId);
    return await RoleModel.updateOne(
      {
        _id: new Types.ObjectId(roleId),
        organizationId: new Types.ObjectId(data.organizationId),
        isSystemRole: false,
      },
      data,
      {
        new: true,
        session,
      },
    );
  }

  async deleteRoleById(roleId: string, session?: ClientSession) {
    return await RoleModel.findOneAndDelete(
      {
        _id: roleId,
        isSystemRole: false, // 🔒 prevent deleting system roles
      },
      { session },
    );
  }

  // PERMISSIONS RELATED REPOSITORIES
  async getPermissionsByKeys(keys: string[]) {
    const permissions = await PermissionModel.find({
      key: { $in: keys },
    });

    return permissions.map((p) => p);
  }
  async getAllPermissions(): Promise<TPermission[]> {
    const permissions = await PermissionModel.find();
    return permissions.map((p) => p.toObject({ virtuals: true }));
  }
  async getPermissionsByRole(roleId: string): Promise<string[]> {
    const permissions = await RolePermissionModel.aggregate([
      {
        $match: {
          roleId: new Types.ObjectId(roleId),
        },
      },
      {
        $lookup: {
          from: "permissions", // collection name (IMPORTANT)
          localField: "permissionId",
          foreignField: "_id",
          as: "permission",
        },
      },
      {
        $unwind: "$permission",
      },
      {
        $project: {
          _id: 0,
          key: "$permission.key",
        },
      },
    ]);

    // return only keys
    return permissions.map((p) => p.key);
  }
  async createRolePermissions(
    data: Partial<TRolePermission>[],
    session?: ClientSession,
  ) {
    return await RolePermissionModel.insertMany(data, {
      ordered: false,
      session,
    });
  }

  async updateRolePermissions(
    roleId: string,
    data: Partial<TRolePermission>[],
  ) {
    return await RolePermissionModel.updateMany({ roleId }, data, {
      new: true,
    });
  }
  async deleteRolePermissions(roleId: string, session?: ClientSession) {
    return await RolePermissionModel.deleteMany({ roleId }, { session });
  }
}
