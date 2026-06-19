import mongoose, { ClientSession } from "mongoose";
import { RoleResponseDto, UpdateRoleDto } from "../dtos/rbac.dto.js";
import { RbacRepository } from "../repositories/rbac.repository.js";
import { NOT_ALLOWED_PERMISSIONS_ACCOUNT_MANGER, ROLES } from "../config/permissions.js";

export class RbacService {
  constructor(private rbacRepo: RbacRepository) {}

  // ROLES RELATED METHODS

  // create default roles and permissions
  async createDefaultRolesAndPermissions(
    orgId: string,
    session: ClientSession,
  ) {
    const roles = await this.rbacRepo.createRoles(
      [
        {
          name: ROLES.OWNER,
          organizationId: orgId,
          isSystemRole: true,
          level: 100,
        },
        {
          name: ROLES.ADMIN,
          organizationId: orgId,
          isSystemRole: true,
          level: 75,
        },
        {
          name: ROLES.ACCOUNT_MANAGER,
          organizationId: orgId,
          isSystemRole: true,
          level: 50,
        },
      ],
      session,
    );

    const permissions = await this.rbacRepo.getAllPermissions();
    const adminRole = roles.find((r) => r.name === ROLES.ADMIN)!;
    const accountManagerRole = roles.find(
      (r) => r.name === ROLES.ACCOUNT_MANAGER,
    );

    await this.rbacRepo.createRolePermissions(
      permissions.map((p) => ({
        roleId: adminRole.id,
        permissionId: p.id,
      })),
      session,
    );

    const accountPermissions = permissions.filter(
      (p) => !NOT_ALLOWED_PERMISSIONS_ACCOUNT_MANGER.includes(p.key),
    );

    await this.rbacRepo.createRolePermissions(
      accountPermissions.map((p) => ({
        roleId: accountManagerRole?.id,
        permissionId: p.id,
      })),
      session,
    );

    return roles;
  }

  // create custom role
  async createCustomRole(data: {
    roleName: string;
    permissions: string[];
    organizationId: string;
  }) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();
      const { roleName, permissions, organizationId } = data;

      const isRoleNameExists = await this.rbacRepo.getRoleByOrgIdAndName(
        organizationId,
        roleName,
      );

      if (isRoleNameExists) throw new Error("Role name already exists");

      // 1️⃣ Create Role
      const [role] = await this.rbacRepo.createRoles(
        [
          {
            name: roleName.toUpperCase(),
            organizationId,
            level: 25,
            isSystemRole: false,
          },
        ],
        session,
      );

      // 2️⃣ Get Permission Docs
      const permissionDocs =
        await this.rbacRepo.getPermissionsByKeys(permissions);

      if (!permissionDocs.length) {
        throw new Error("Invalid permissions");
      }

      // 3️⃣ Create RolePermissions
      const rolePermissions = permissionDocs.map((p) => ({
        roleId: role.id.toString(),
        permissionId: p.id,
      }));

      await this.rbacRepo.createRolePermissions(rolePermissions, session);

      await session.commitTransaction();

      return {
        id: role._id,
        name: role.name,
        isSystemRole: role.isSystemRole,
      };
    } catch (error) {
      console.log(error);
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // get single role by id
  async getRoleById(roleId: string) {
    const role = await this.rbacRepo.getRoleById(roleId);
    if (!role) return null;
    return new RoleResponseDto(role);
  }
  // get single role by org id and name
  async getRoleByOrgIdAndName(
    orgId: string,
    name: string,
  ): Promise<RoleResponseDto | null> {
    const role = await this.rbacRepo.getRoleByOrgIdAndName(orgId, name);

    if (!role) return null;
    return new RoleResponseDto(role);
  }
  // get all roles of organization
  async getRolesByOrganization(orgId: string, currentRole?: { level: number }) {
    const roles = await this.rbacRepo.getRolesByOrganization(
      orgId,
      currentRole?.level,
    );
    if (!roles) return [];
    return roles.map((r) => new RoleResponseDto(r));
  }

  async updateRole(roleId: string, data: UpdateRoleDto) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();
      const { name, permissions, organizationId } = data;

      // 1️⃣ Update role name (if provided)
      if (name) {
        const existingRole = await this.rbacRepo.getRoleByOrgIdAndName(
          organizationId,
          name,
        );

        if (existingRole && existingRole.id !== roleId) {
          throw new Error("Role name already exists");
        }

        await this.rbacRepo.updateRoleById(
          roleId,
          { name: name.toUpperCase(), organizationId },
          session,
        );
      }

      // 2️⃣ Update permissions (if provided)
      if (permissions) {
        // get permission docs
        if (!permissions.length) throw new Error("Invalid permissions");

        const permissionDocs =
          await this.rbacRepo.getPermissionsByKeys(permissions);

        await this.rbacRepo.deleteRolePermissions(roleId, session);

        const rolePermissions = permissionDocs.map((p) => ({
          roleId,
          permissionId: p.id,
        }));

        await this.rbacRepo.createRolePermissions(rolePermissions, session);
      }

      await session.commitTransaction();
      return await this.getRoleById(roleId); // return updated role with permissions
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // delete role by id
  async deleteRole(roleId: string) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      await this.rbacRepo.deleteRoleById(roleId, session);
      await this.rbacRepo.deleteRolePermissions(roleId, session);
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    }
  }
  // PERMISSIONS RELATED METHODS
  async getPermissionsByRole(roleId: string) {
    return this.rbacRepo.getPermissionsByRole(roleId);
  }
}
