export class CreateRoleDto {
  roleName: string;
  permissions: string[];
  organizationId: string;

  constructor(data: CreateRoleDto) {
    if (!data.roleName) throw new Error("roleName is required");
    if (!data.permissions) throw new Error("permissions is required");
    if (!Array.isArray(data.permissions))
      throw new Error("permissions must be an array");
    if (!data.organizationId) throw new Error("organizationId is required");

    this.roleName = data.roleName;
    this.permissions = data.permissions;
    this.organizationId = data.organizationId;
  }
}
export class RoleResponseDto {
  id: string;
  name: string;
  organizationId: string;
  level: number;
  isSystemRole: boolean;

  constructor(data: {
    id: string;
    name: string;
    organizationId: string;
    level: number;
    isSystemRole: boolean;
  }) {
    this.id = data.id;
    this.name = data.name;
    this.organizationId = data.organizationId;
    this.level = data.level;
    this.isSystemRole = data.isSystemRole;
  }
}
export class UpdateRoleDto {
  roleId: string;
  name?: string;
  permissions?: string[];
  organizationId: string;

  constructor(data: UpdateRoleDto) {
    if (!data.roleId) throw new Error("roleId is required");
    if (!data.organizationId) throw new Error("organizationId is required");
    this.roleId = data.roleId;
    this.name = data.name;
    this.permissions = data.permissions;
    this.organizationId = data.organizationId;
  }
}
