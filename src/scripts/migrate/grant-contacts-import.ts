import path from "node:path";
import { pathToFileURL } from "node:url";
import mongoose from "mongoose";
import { PermissionModel } from "../../models/permissions.model.js";
import { RoleModel } from "../../models/role.model.js";
import { RolePermissionModel } from "../../models/role-permissions.js";

export const CONTACTS_CREATE_PERMISSION = "contacts.create";
export const CONTACTS_IMPORT_PERMISSION = "contacts.import";

export interface GrantPlanRole {
  roleId: string;
  name: string;
  organizationId: string;
  alreadyHasImport: boolean;
}

export interface GrantContactsImportPlan {
  createPermissionId?: string;
  importPermissionId: string;
  roles: GrantPlanRole[];
}

export interface GrantContactsImportApplyResult {
  granted: number;
  skipped: number;
  roleIds: string[];
}

export async function ensureContactsImportPermission(): Promise<string> {
  const doc = await PermissionModel.findOneAndUpdate(
    { key: CONTACTS_IMPORT_PERMISSION },
    {
      $setOnInsert: {
        key: CONTACTS_IMPORT_PERMISSION,
        module: "contacts",
        action: "import",
      },
    },
    { upsert: true, new: true },
  ).lean();
  if (!doc) {
    throw new Error("Failed to upsert contacts.import permission");
  }
  return String(doc._id);
}

export async function planGrantContactsImport(): Promise<GrantContactsImportPlan> {
  const importPermissionId = await ensureContactsImportPermission();
  const createPerm = await PermissionModel.findOne({ key: CONTACTS_CREATE_PERMISSION }).lean();
  if (!createPerm) {
    return { importPermissionId, roles: [] };
  }
  const roleIds = await RolePermissionModel.distinct("roleId", {
    permissionId: createPerm._id,
  });
  if (roleIds.length === 0) {
    return {
      createPermissionId: String(createPerm._id),
      importPermissionId,
      roles: [],
    };
  }
  const existingImport = await RolePermissionModel.find({
    roleId: { $in: roleIds },
    permissionId: importPermissionId,
  }).lean();
  const already = new Set(existingImport.map((row) => String(row.roleId)));
  const roles = await RoleModel.find({ _id: { $in: roleIds } }).lean();
  return {
    createPermissionId: String(createPerm._id),
    importPermissionId,
    roles: roles.map((role) => ({
      roleId: String(role._id),
      name: String(role.name),
      organizationId: String(role.organizationId),
      alreadyHasImport: already.has(String(role._id)),
    })),
  };
}

export async function applyGrantContactsImport(): Promise<GrantContactsImportApplyResult> {
  const plan = await planGrantContactsImport();
  const missing = plan.roles.filter((role) => !role.alreadyHasImport);
  for (const role of missing) {
    await RolePermissionModel.updateOne(
      { roleId: role.roleId, permissionId: plan.importPermissionId },
      {
        $setOnInsert: {
          roleId: role.roleId,
          permissionId: plan.importPermissionId,
        },
      },
      { upsert: true },
    );
  }
  return {
    granted: missing.length,
    skipped: plan.roles.length - missing.length,
    roleIds: missing.map((role) => role.roleId),
  };
}

export function formatGrantPlan(plan: GrantContactsImportPlan, apply: boolean): string {
  const wouldGain = plan.roles.filter((role) => !role.alreadyHasImport);
  const already = plan.roles.filter((role) => role.alreadyHasImport);
  const lines = [
    `Roles with ${CONTACTS_CREATE_PERMISSION}: ${plan.roles.length}`,
    `Would gain ${CONTACTS_IMPORT_PERMISSION}: ${wouldGain.length}`,
  ];
  for (const role of wouldGain) {
    lines.push(`  ${role.name}\torg=${role.organizationId}\tid=${role.roleId}`);
  }
  if (already.length > 0) {
    lines.push(`Already have ${CONTACTS_IMPORT_PERMISSION}: ${already.length}`);
    for (const role of already) {
      lines.push(`  ${role.name}\torg=${role.organizationId}\tid=${role.roleId}`);
    }
  }
  if (!apply) {
    lines.push("Dry-run only. Re-run with --apply to grant.");
  }
  return lines.join("\n");
}

function invokedAsCli(): boolean {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  return import.meta.url === pathToFileURL(path.resolve(entry)).href;
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const { config } = await import("../../config/index.js");
  await mongoose.connect(config.db.url);
  try {
    const plan = await planGrantContactsImport();
    console.log(formatGrantPlan(plan, apply));
    if (apply) {
      const result = await applyGrantContactsImport();
      console.log(`Applied. granted=${result.granted} skipped=${result.skipped}`);
    }
  } finally {
    await mongoose.disconnect();
  }
}

if (invokedAsCli()) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error("grant-contacts-import failed:", message);
    process.exit(1);
  });
}
