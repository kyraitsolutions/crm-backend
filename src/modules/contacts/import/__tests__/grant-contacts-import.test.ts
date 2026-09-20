import { Types } from "mongoose";
import { PermissionModel } from "../../../../models/permissions.model.js";
import { RoleModel } from "../../../../models/role.model.js";
import { RolePermissionModel } from "../../../../models/role-permissions.js";
import {
  applyGrantContactsImport,
  formatGrantPlan,
  planGrantContactsImport,
} from "../../../../scripts/migrate/grant-contacts-import.js";
import {
  startImportTestMongo,
  stopImportTestMongo,
} from "./mongo-test-env.js";

describe("migrate:grant-contacts-import", () => {
  beforeAll(async () => {
    await startImportTestMongo();
    await Promise.all([
      PermissionModel.syncIndexes(),
      RoleModel.syncIndexes(),
      RolePermissionModel.syncIndexes(),
    ]);
  }, 120_000);

  afterAll(async () => {
    await stopImportTestMongo();
  });

  beforeEach(async () => {
    await Promise.all([
      PermissionModel.deleteMany({}),
      RoleModel.deleteMany({}),
      RolePermissionModel.deleteMany({}),
    ]);
  });

  async function seedRoles() {
    const orgId = new Types.ObjectId();
    const createPerm = await PermissionModel.create({
      key: "contacts.create",
      module: "contacts",
      action: "create",
    });
    const admin = await RoleModel.create({
      name: "ADMIN",
      organizationId: orgId,
      level: 1,
    });
    const owner = await RoleModel.create({
      name: "OWNER",
      organizationId: orgId,
      level: 0,
    });
    const viewer = await RoleModel.create({
      name: "VIEWER",
      organizationId: orgId,
      level: 5,
    });
    await RolePermissionModel.create({
      roleId: admin._id,
      permissionId: createPerm._id,
    });
    await RolePermissionModel.create({
      roleId: owner._id,
      permissionId: createPerm._id,
    });
    return { orgId, createPerm, admin, owner, viewer };
  }

  it("dry-run prints roles that would gain contacts.import and does not grant", async () => {
    const { admin, owner, viewer } = await seedRoles();
    const importPerm = await PermissionModel.create({
      key: "contacts.import",
      module: "contacts",
      action: "import",
    });
    await RolePermissionModel.create({
      roleId: owner._id,
      permissionId: importPerm._id,
    });
    const before = await RolePermissionModel.countDocuments({ permissionId: importPerm._id });

    const plan = await planGrantContactsImport();
    expect(plan.roles.map((role) => role.name).sort()).toEqual(["ADMIN", "OWNER"]);
    expect(plan.roles.find((role) => role.roleId === String(admin._id))?.alreadyHasImport).toBe(false);
    expect(plan.roles.find((role) => role.roleId === String(owner._id))?.alreadyHasImport).toBe(true);
    expect(plan.roles.some((role) => role.roleId === String(viewer._id))).toBe(false);
    expect(formatGrantPlan(plan, false)).toContain("Dry-run only. Re-run with --apply to grant.");
    expect(formatGrantPlan(plan, false)).toContain("ADMIN");

    expect(await RolePermissionModel.countDocuments({ permissionId: importPerm._id })).toBe(before);
  });

  it("apply grants missing contacts.import and is idempotent", async () => {
    const { admin, owner } = await seedRoles();
    const first = await applyGrantContactsImport();
    expect(first.granted).toBe(2);
    expect(first.roleIds.sort()).toEqual([String(admin._id), String(owner._id)].sort());

    const importPerm = await PermissionModel.findOne({ key: "contacts.import" }).lean();
    expect(importPerm).toBeTruthy();
    expect(await RolePermissionModel.countDocuments({ permissionId: importPerm?._id })).toBe(2);

    const second = await applyGrantContactsImport();
    expect(second.granted).toBe(0);
    expect(second.skipped).toBe(2);
    expect(await RolePermissionModel.countDocuments({ permissionId: importPerm?._id })).toBe(2);
  });
});
