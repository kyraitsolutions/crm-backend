export class CreateRoleDto {
  roleName: string;
  permissions: string[];
  organizationId: string;

  constructor(data: CreateRoleDto) {
    const ALLOWED_FIELDS = ["roleName", "permissions"];

    Object.keys(data).forEach((key) => {
      if (!ALLOWED_FIELDS.includes(key))
        throw new Error(`Unknown field: ${key}`);
    });

    if (!data.roleName) throw new Error("roleName is required");
    if (!data.permissions) throw new Error("permissions is required");
    if (!Array.isArray(data.permissions))
      throw new Error("permissions must be an array");
    if (data.organizationId && data.organizationId === "")
      throw new Error("organizationId is required");

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
    const ALLOWED_FIELDS = ["roleId", "name", "permissions", "organizationId"];

    const unknownFields = Object.keys(data).filter(
      (key) => !ALLOWED_FIELDS.includes(key),
    );

    if (unknownFields.length) {
      throw new Error(`Unknown fields: ${unknownFields.join(", ")}`);
    }

    if (data.name && data.name === "") throw new Error("name is required");
    if (data.permissions) {
      if (!Array.isArray(data.permissions))
        throw new Error("permissions must be an array");
    }

    this.roleId = data.roleId;
    this.name = data.name;
    this.permissions = data.permissions;
    this.organizationId = data.organizationId;
  }
}
