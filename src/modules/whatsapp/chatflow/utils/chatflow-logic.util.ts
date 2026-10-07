export type FlowVariables = Record<string, string>;

export type ConditionRule = {
  left?: string;
  operator?: string;
  right?: string;
};

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "169.254.169.254",
]);

function placeholderPattern() {
  return /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;
}

export function fillTemplate(template: string, variables: FlowVariables) {
  return String(template || "").replace(placeholderPattern(), (_, key) => {
    return variables[key] ?? "";
  });
}

export function interpolateMessage(template: string, variables: FlowVariables) {
  const missing: string[] = [];
  const text = String(template || "").replace(placeholderPattern(), (_, key) => {
    if (variables[key] === undefined || variables[key] === null) {
      missing.push(key);
      return "";
    }
    return variables[key];
  });
  return { text, missing };
}

type VariableSource = Record<string, unknown> | null | undefined;

export function resolveTemplateVariables(sources: {
  session?: VariableSource;
  conversation?: VariableSource;
  contact?: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    attributes?: VariableSource;
  } | null;
}) {
  const resolved: FlowVariables = {};
  const contact = sources.contact;
  if (contact?.phone) resolved.phone = String(contact.phone);
  if (contact?.name) resolved.name = String(contact.name);
  if (contact?.email) resolved.email = String(contact.email);
  assignFlat(resolved, contact?.attributes);
  assignFlat(resolved, sources.conversation);
  assignFlat(resolved, sources.session);
  return resolved;
}

export function syncResolvedVariables(
  session: FlowVariables,
  before: FlowVariables,
  after: FlowVariables,
) {
  for (const [key, value] of Object.entries(after)) {
    if (before[key] !== value) session[key] = value;
  }
}

function assignFlat(target: FlowVariables, source: VariableSource) {
  if (!source || typeof source !== "object") return;
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      target[key] = String(value);
    }
  }
}

export function evaluateRules(
  rules: ConditionRule[],
  match: string,
  variables: FlowVariables,
) {
  const results = (rules || []).map((rule) => evaluateRule(rule, variables));
  if (!results.length) return false;
  return match === "any" ? results.some(Boolean) : results.every(Boolean);
}

export function safeRequestUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host) || host.endsWith(".local")) return null;
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host)) return null;
  return url.toString();
}

const DELAY_LIMITS: Record<string, { ms: number; max: number }> = {
  seconds: { ms: 1000, max: 300 },
  minutes: { ms: 60_000, max: 1440 },
  hours: { ms: 3_600_000, max: 72 },
  days: { ms: 86_400_000, max: 30 },
};

export function delayMilliseconds(delay?: {
  seconds?: number;
  unit?: string;
  amount?: number;
}) {
  const unit = DELAY_LIMITS[String(delay?.unit || "seconds")]
    ? String(delay?.unit || "seconds")
    : "seconds";
  const limit = DELAY_LIMITS[unit];
  const raw = Number(delay?.amount ?? delay?.seconds ?? 0);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return Math.min(limit.max, raw) * limit.ms;
}

export function matchesKeyword(
  keyword: { words?: string; match?: string; caseSensitive?: boolean } | undefined,
  text: string,
) {
  const sensitive = Boolean(keyword?.caseSensitive);
  const incoming = String(text || "").trim();
  if (!incoming) return false;
  const words = String(keyword?.words || "")
    .split(",")
    .map((word) => word.trim())
    .filter(Boolean);
  if (!words.length) return false;
  const mode = keyword?.match === "exact" || keyword?.match === "phrase" ? keyword.match : "contains";
  const haystack = sensitive ? incoming : incoming.toLowerCase();

  return words.some((word) => {
    const needle = sensitive ? word : word.toLowerCase();
    if (mode === "exact") return haystack === needle;
    if (mode === "phrase") {
      const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`, sensitive ? "" : "i").test(incoming);
    }
    return haystack.includes(needle);
  });
}

/** Keyword start may open a flow on an existing chat when the inbound text matched. Completed stays blocked. */
export function mayKeywordStartOnExisting(startKind: string, keywordMatched: boolean) {
  return startKind === "keyword" && keywordMatched === true;
}

export function validateQuestionReply(input: {
  inputType?: string;
  required?: boolean;
  options?: string[];
  text?: string;
  inboundType?: string;
}) {
  const text = String(input.text || "").trim();
  const inboundType = String(input.inboundType || "text");
  if (input.required === false) return { ok: true, value: text };

  const inputType = String(input.inputType || "text");
  switch (inputType) {
    case "email":
      return { ok: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text), value: text };
    case "phone":
      return { ok: /^\+?[0-9][0-9\s()-]{6,}$/.test(text), value: text };
    case "number":
      return { ok: /^-?\d+(\.\d+)?$/.test(text), value: text };
    case "date":
    case "date-range":
      return {
        ok: /^\d{4}-\d{2}-\d{2}$/.test(text) || /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(text),
        value: text,
      };
    case "datetime":
      return { ok: /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(text), value: text };
    case "location":
      return {
        ok: inboundType === "location" || /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(text),
        value: text,
      };
    case "media":
      return {
        ok: ["image", "video", "document", "audio", "sticker"].includes(inboundType),
        value: text,
      };
    case "address":
      return { ok: text.length >= 5, value: text };
    case "buttons": {
      const options = (input.options || []).map((option) => option.trim().toLowerCase()).filter(Boolean);
      if (!options.length) return { ok: text.length > 0, value: text };
      return { ok: options.includes(text.toLowerCase()), value: text };
    }
    default:
      return { ok: text.length > 0, value: text };
  }
}

export function questionAttributeKey(inputType: string | undefined, attribute: string | undefined) {
  const custom = String(attribute || "").trim().replace(/[^a-zA-Z0-9_]/g, "");
  if (custom) return custom;
  if (inputType === "address") return "address";
  if (inputType === "location") return "location";
  if (inputType === "media") return "media";
  return "";
}

function evaluateRule(rule: ConditionRule, variables: FlowVariables) {
  const left = fillTemplate(String(rule.left || ""), variables).trim();
  const right = fillTemplate(String(rule.right || ""), variables).trim();
  const operator = String(rule.operator || "equals");

  switch (operator) {
    case "equals":
      return left.toLowerCase() === right.toLowerCase();
    case "not_equals":
      return left.toLowerCase() !== right.toLowerCase();
    case "contains":
      return left.toLowerCase().includes(right.toLowerCase());
    case "not_contains":
      return !left.toLowerCase().includes(right.toLowerCase());
    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      if (!left || !right) return false;
      const leftNumber = Number(left);
      const rightNumber = Number(right);
      if (!Number.isFinite(leftNumber) || !Number.isFinite(rightNumber)) return false;
      if (operator === "gt") return leftNumber > rightNumber;
      if (operator === "gte") return leftNumber >= rightNumber;
      if (operator === "lt") return leftNumber < rightNumber;
      return leftNumber <= rightNumber;
    }
    case "empty":
      return left.length === 0;
    case "not_empty":
      return left.length > 0;
    default:
      return false;
  }
}
