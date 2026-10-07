const SKIP_KEYS = new Set([
  "_id",
  "id",
  "__v",
  "createdAt",
  "updatedAt",
  "meta",
  "accountId",
  "organizationId",
  "entityType",
  "entityId",
  "searchText",
  // Joined / computed on read — not lead schema fields
  "emails",
]);

function toComparable(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value) && value.length === 0) return "";
  if (typeof value === "object") {
    // ObjectId / Date / nested
    if (
      value &&
      typeof (value as { toHexString?: () => string }).toHexString === "function"
    ) {
      return (value as { toHexString: () => string }).toHexString();
    }
    if (value instanceof Date) return value.toISOString();
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function normalizeStoredValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (
    value &&
    typeof value === "object" &&
    typeof (value as { toHexString?: () => string }).toHexString === "function"
  ) {
    return (value as { toHexString: () => string }).toHexString();
  }
  if (value instanceof Date) return value.toISOString();
  return value;
}

export function getObjectChanges(
  oldDoc: Record<string, any> | null | undefined,
  newDoc: Record<string, any> | null | undefined,
) {
  const before = oldDoc || {};
  const after = newDoc || {};
  const changes: Record<string, { from: unknown; to: unknown }> = {};

  const keys = new Set([
    ...Object.keys(before),
    ...Object.keys(after),
  ]);

  for (const key of keys) {
    if (SKIP_KEYS.has(key)) continue;

    const oldValue = before[key];
    const newValue = after[key];

    if (toComparable(oldValue) === toComparable(newValue)) continue;

    changes[key] = {
      from: normalizeStoredValue(oldValue),
      to: normalizeStoredValue(newValue),
    };
  }

  return changes;
}
