import { ROLES } from "../../../config/permissions.js";
import { RoleModel } from "../../../models/role.model.js";
import { UserAccount } from "../../../models/user.accounts.model.js";
import type { RecipientStrategy } from "../types/notification-config.types.js";

export type RecipientResolveInput = {
  organizationId: string;
  accountId: string;
  strategy: RecipientStrategy;
  assigneeId?: string | null;
  ownerId?: string | null;
  /** Explicit override from caller. */
  recipientUserIds?: string[];
};

function uniqueIds(ids: Array<string | null | undefined>): string[] {
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}

async function accountMemberIds(
  organizationId: string,
  accountId: string,
): Promise<string[]> {
  const rows = await UserAccount.find({
    accountId,
    $or: [{ organizationId }, { organizationId: { $exists: false } }],
  })
    .select("userId")
    .lean();

  return uniqueIds(rows.map((row) => String(row.userId)));
}

async function adminMemberIds(
  organizationId: string,
  accountId: string,
): Promise<string[]> {
  const adminRoles = await RoleModel.find({
    organizationId,
    name: { $in: [ROLES.OWNER, ROLES.ADMIN] },
  })
    .select("_id")
    .lean();

  const roleIds = adminRoles.map((role) => role._id);
  if (!roleIds.length) {
    return accountMemberIds(organizationId, accountId);
  }

  const rows = await UserAccount.find({
    accountId,
    roleId: { $in: roleIds },
  })
    .select("userId")
    .lean();

  const ids = uniqueIds(rows.map((row) => String(row.userId)));
  return ids.length ? ids : accountMemberIds(organizationId, accountId);
}

/**
 * Resolve which users should be considered for a notification event.
 */
export async function resolveRecipients(
  input: RecipientResolveInput,
): Promise<string[]> {
  if (input.recipientUserIds?.length) {
    return uniqueIds(input.recipientUserIds);
  }

  switch (input.strategy) {
    case "assignee": {
      if (input.assigneeId) return [String(input.assigneeId)];
      return accountMemberIds(input.organizationId, input.accountId);
    }
    case "owner": {
      if (input.ownerId) return [String(input.ownerId)];
      return adminMemberIds(input.organizationId, input.accountId);
    }
    case "admins":
      return adminMemberIds(input.organizationId, input.accountId);
    case "team":
    case "account":
    default:
      return accountMemberIds(input.organizationId, input.accountId);
  }
}
