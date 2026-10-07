import mongoose from "mongoose";
import { UserModel } from "../models/user.model.js";
import { UserProfileModel } from "../models/userProfile.model.js";

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

/** Fields that store a user id and should show a person name in activity logs */
const USER_REF_FIELDS = new Set([
  "assignedTo",
  "assignedBy",
  "ownerId",
  "userId",
  "createdBy",
  "updatedBy",
]);

function asId(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (obj.id != null && OBJECT_ID_RE.test(String(obj.id))) {
      return String(obj.id);
    }
    if (obj._id != null && OBJECT_ID_RE.test(String(obj._id))) {
      return String(obj._id);
    }
    if (obj.userId != null && OBJECT_ID_RE.test(String(obj.userId))) {
      return String(obj.userId);
    }
    if (
      typeof (value as { toHexString?: () => string }).toHexString === "function"
    ) {
      return (value as { toHexString: () => string }).toHexString();
    }
  }
  const str = String(value);
  return OBJECT_ID_RE.test(str) ? str : null;
}

function displayUser(user: {
  email?: string;
  userProfile?: { firstName?: string; lastName?: string };
}): string {
  const name =
    `${user.userProfile?.firstName || ""} ${user.userProfile?.lastName || ""}`.trim();
  return name || user.email || "Unknown user";
}

async function resolveUserLabels(
  ids: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((id) => OBJECT_ID_RE.test(id)))];
  const map = new Map<string, string>();
  if (!unique.length) return map;

  const objectIds = unique.map((id) => new mongoose.Types.ObjectId(id));
  
  const [users, profiles] = await Promise.all([
    UserModel.find({ _id: { $in: objectIds } })
      .select("_id email")
      .lean(),
    UserProfileModel.find({ userId: { $in: objectIds } })
      .select("userId firstName lastName")
      .lean(),
  ]);

  const profileByUser = new Map(
    profiles.map((p) => [String(p.userId), p]),
  );

  for (const user of users) {
    const id = String(user._id);
    const profile = profileByUser.get(id);
    map.set(
      id,
      displayUser({
        email: user.email as string | undefined,
        userProfile: profile
          ? {
              firstName: profile.firstName as string | undefined,
              lastName: profile.lastName as string | undefined,
            }
          : undefined,
      }),
    );
  }

  return map;
}

function formatSourceValue(value: unknown): unknown {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const src = value as Record<string, unknown>;
    if (typeof src.name === "string" && src.name) return src.name;
    if (typeof src.label === "string" && src.label) return src.label;
  }
  return value;
}

function labeledValue(id: string | null, label: string | null | undefined) {
  if (!id && !label) return null;
  // Never expose bare Mongo ids to the UI — users can't read them
  const resolved = label?.trim() || "Unknown user";
  return id ? { id, label: resolved } : resolved;
}

function asChange(
  value: unknown,
): { from: unknown; to: unknown } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const obj = value as Record<string, unknown>;
  // Some legacy rows may only have one side; still treat as a change object.
  if (!("from" in obj) && !("to" in obj)) {
    return null;
  }
  return {
    from: obj.from ?? null,
    to: obj.to ?? null,
  };
}

/**
 * Turn raw Mongo ids / nested objects in activity `changes`
 * into human-readable labels for the UI.
 */
export async function enrichActivityChanges(
  changes: Record<string, { from: unknown; to: unknown }> | null | undefined,
  entityType?: string,
): Promise<Record<string, { from: unknown; to: unknown }>> {
  if (!changes || typeof changes !== "object") return {};

  const entries = Object.entries(changes as Record<string, unknown>);
  if (!entries.length) return {};

  const userIds: string[] = [];
  for (const [field, raw] of entries) {
    if (!USER_REF_FIELDS.has(field)) continue;
    const change = asChange(raw);
    if (!change) continue;
    const fromId = asId(change.from);
    const toId = asId(change.to);
    if (fromId) userIds.push(fromId);
    if (toId) userIds.push(toId);
  }

  const userLabels = await resolveUserLabels(userIds);
  const enriched: Record<string, { from: unknown; to: unknown }> = {};

  for (const [field, raw] of entries) {
    const change = asChange(raw);
    if (!change) continue;

    if (USER_REF_FIELDS.has(field)) {
      const fromId = asId(change.from);
      const toId = asId(change.to);
      enriched[field] = {
        from: labeledValue(fromId, fromId ? userLabels.get(fromId) : null),
        to: labeledValue(toId, toId ? userLabels.get(toId) : null),
      };
      continue;
    }

    if (field === "source") {
      enriched[field] = {
        from: formatSourceValue(change.from),
        to: formatSourceValue(change.to),
      };
      continue;
    }

    const formatMaybeNamed = (value: unknown) => {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const obj = value as Record<string, unknown>;
        if (typeof obj.label === "string") return obj.label;
        if (typeof obj.name === "string") return obj.name;
        if (typeof obj.title === "string") return obj.title;
      }
      return value;
    };

    enriched[field] = {
      from: formatMaybeNamed(change.from),
      to: formatMaybeNamed(change.to),
    };
  }

  void entityType;

  return enriched;
}
