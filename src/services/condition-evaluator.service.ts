import {
  CONDITION_FIELD_PATHS,
  CONDITION_OPERATORS,
} from "../constants/automation.constant.js";

function getByPath(payload: Record<string, unknown>, path: string): unknown {
  if (!path) return undefined;
  if (!path.includes(".")) {
    return payload?.[path];
  }
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, payload);
}

function normalize(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object" && value !== null && "id" in (value as object)) {
    return String((value as { id?: unknown }).id ?? "").trim().toLowerCase();
  }
  if (typeof value === "object" && value !== null && "_id" in (value as object)) {
    return String((value as { _id?: unknown })._id ?? "").trim().toLowerCase();
  }
  if (typeof value === "object" && value !== null && "userId" in (value as object)) {
    return String((value as { userId?: unknown }).userId ?? "")
      .trim()
      .toLowerCase();
  }
  if (typeof value === "object" && value !== null && "label" in (value as object)) {
    return String((value as { label?: unknown }).label ?? "")
      .trim()
      .toLowerCase();
  }
  return String(value).trim().toLowerCase();
}

function asList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return values.map((v) => normalize(v)).filter(Boolean);
}

/** Flatten arrays / tag objects into comparable string tokens */
function valueTokens(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.flatMap((item) => valueTokens(item)).filter(Boolean);
  }
  const n = normalize(raw);
  return n ? [n] : [];
}

function isEmpty(raw: unknown): boolean {
  if (raw == null) return true;
  if (Array.isArray(raw)) return raw.length === 0;
  if (typeof raw === "string") return raw.trim() === "";
  return normalize(raw) === "";
}

export default class ConditionEvaluator {
  /**
   * All conditions must match (AND). Empty conditions = always match.
   */
  evaluate(conditions: any[] | undefined | null, payload: any): boolean {
    if (!Array.isArray(conditions) || conditions.length === 0) {
      return true;
    }

    return conditions.every((condition) =>
      this.matchCondition(condition, payload),
    );
  }

  private matchCondition(condition: any, payload: any): boolean {
    const path =
      CONDITION_FIELD_PATHS[condition.field] ||
      String(condition.field || "").trim();
    const raw = getByPath(payload, path);
    const tokens = valueTokens(raw);
    const value = tokens.join(" ");
    const values = asList(condition.values);
    const operator = String(condition.operator || CONDITION_OPERATORS.EQUALS);

    switch (operator) {
      case CONDITION_OPERATORS.EQUALS:
        if (values.length === 0) return false;
        // Array fields (tags): any selected value present
        if (Array.isArray(raw)) {
          return values.some((v) => tokens.includes(v));
        }
        return values.includes(normalize(raw));

      case CONDITION_OPERATORS.NOT_EQUALS:
        if (values.length === 0) return true;
        if (Array.isArray(raw)) {
          return values.every((v) => !tokens.includes(v));
        }
        return !values.includes(normalize(raw));

      case CONDITION_OPERATORS.CONTAINS:
        if (Array.isArray(raw)) {
          return values.some((v) => tokens.some((t) => t.includes(v)));
        }
        return values.some((v) => value.includes(v));

      case CONDITION_OPERATORS.NOT_CONTAINS:
        if (Array.isArray(raw)) {
          return values.every((v) => tokens.every((t) => !t.includes(v)));
        }
        return values.every((v) => !value.includes(v));

      case CONDITION_OPERATORS.IS_EMPTY:
        return isEmpty(raw);

      case CONDITION_OPERATORS.IS_NOT_EMPTY:
        return !isEmpty(raw);

      default:
        return false;
    }
  }
}
