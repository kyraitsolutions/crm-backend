import { z } from "zod";
import { ZBaseEntity } from "./base.type";

const ZRoleSchema = ZBaseEntity.extend({
  name: z.string(),
  organizationId: z.string(),
  isSystemRole: z.boolean(),
  level: z.number(),
});

const ZRolePermissionSchema = ZBaseEntity.extend({
  roleId: z.string(),
  permissionId: z.string(),
});

const ZPermissionsSchema = ZBaseEntity.extend({
  key: z.string(),
  module: z.string().optional(),
  action: z.string().optional(),
});

export type TRole = z.infer<typeof ZRoleSchema>;
export type TPermission = z.infer<typeof ZPermissionsSchema>;
export type TRolePermission = z.infer<typeof ZRolePermissionSchema>;
