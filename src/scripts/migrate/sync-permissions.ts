/**
 * Upsert all catalog permission keys, then grant missing ones to system roles:
 * - ADMIN → all catalog keys
 * - ACCOUNT_MANAGER → all except NOT_ALLOWED_PERMISSIONS_ACCOUNT_MANGER
 *
 * Usage:
 *   npm run migrate:sync-permissions
 *   npm run migrate:sync-permissions -- --apply
 */
import path from "node:path";
import { pathToFileURL } from "node:url";
import mongoose from "mongoose";
import {
  NOT_ALLOWED_PERMISSIONS_ACCOUNT_MANGER,
  PERMISSIONS,
  ROLES,
} from "../../config/permissions.js";
import { PermissionModel } from "../../models/permissions.model.js";
import { RoleModel } from "../../models/role.model.js";
import { RolePermissionModel } from "../../models/role-permissions.js";
import { seedPermissions } from "../seed/seedPermissions.js";

async function syncRolePermissions(
  roleName: string,
  allowedKeys: string[],
  apply: boolean,
) {
  const roles = await RoleModel.find({ name: roleName, isSystemRole: true })
    .select("_id name organizationId")
    .lean();
  if (!roles.length) {
    return { roles: 0, wouldGrant: 0, granted: 0 };
  }

  const perms = await PermissionModel.find({ key: { $in: allowedKeys } })
    .select("_id key")
    .lean();
  const permissionIds = perms.map((p) => p._id);
  if (!permissionIds.length) {
    return { roles: roles.length, wouldGrant: 0, granted: 0 };
  }

  const roleIds = roles.map((r) => r._id);
  const existing = await RolePermissionModel.find({
    roleId: { $in: roleIds },
    permissionId: { $in: permissionIds },
  })
    .select("roleId permissionId")
    .lean();

  const have = new Set(
    existing.map((row) => `${String(row.roleId)}:${String(row.permissionId)}`),
  );

  const inserts: Array<{ roleId: unknown; permissionId: unknown }> = [];
  for (const role of roles) {
    for (const permissionId of permissionIds) {
      const key = `${String(role._id)}:${String(permissionId)}`;
      if (have.has(key)) continue;
      inserts.push({ roleId: role._id, permissionId });
    }
  }

  if (apply && inserts.length) {
    await RolePermissionModel.insertMany(inserts, { ordered: false }).catch(
      () => undefined,
    );
  }

  return {
    roles: roles.length,
    wouldGrant: inserts.length,
    granted: apply ? inserts.length : 0,
  };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const { config } = await import("../../config/index.js");
  await mongoose.connect(config.db.url);
  try {
    await seedPermissions();
    console.log(`Catalog keys: ${PERMISSIONS.length}`);

    const adminKeys = [...PERMISSIONS];
    const amKeys = PERMISSIONS.filter(
      (k) => !NOT_ALLOWED_PERMISSIONS_ACCOUNT_MANGER.includes(k),
    );

    const admin = await syncRolePermissions(ROLES.ADMIN, adminKeys, apply);
    const am = await syncRolePermissions(ROLES.ACCOUNT_MANAGER, amKeys, apply);

    console.log(
      `ADMIN roles=${admin.roles} missingLinks=${admin.wouldGrant}${apply ? ` granted=${admin.granted}` : ""}`,
    );
    console.log(
      `ACCOUNT_MANAGER roles=${am.roles} missingLinks=${am.wouldGrant}${apply ? ` granted=${am.granted}` : ""}`,
    );
    if (!apply) {
      console.log("Dry-run only. Re-run with --apply to grant.");
    }
  } finally {
    await mongoose.disconnect();
  }
}

function invokedAsCli(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(path.resolve(entry)).href;
}

if (invokedAsCli()) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error("sync-permissions failed:", message);
    process.exit(1);
  });
}
