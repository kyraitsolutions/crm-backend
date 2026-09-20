import type { ImportFieldMapping } from "../types/import.types.js";

export interface MappedRow {
  name?: string;
  email?: string;
  phone?: string;
  status?: string;
  tags?: string[];
  whatsappOptIn?: boolean;
  sourceColumn: Partial<Record<"name" | "email" | "phone" | "status" | "tags" | "whatsapp.optIn", string>>;
}

export function mapRow(
  raw: string[],
  headers: string[],
  mapping: ImportFieldMapping[],
): MappedRow {
  const byHeader = new Map<string, { value: string; index: number }>();
  headers.forEach((header, index) => {
    byHeader.set(header, { value: raw[index] ?? "", index });
  });

  const mapped: MappedRow = { sourceColumn: {} };

  for (const item of mapping) {
    if (item.target === "ignore") {
      continue;
    }
    const cell = byHeader.get(item.source);
    const rawValue = cell?.value ?? "";
    const value = applyTransform(rawValue, item.transform);
    mapped.sourceColumn[item.target] = item.source;
    switch (item.target) {
      case "name":
        mapped.name = value;
        break;
      case "email":
        mapped.email = value;
        break;
      case "phone":
        mapped.phone = value;
        break;
      case "status":
        mapped.status = value;
        break;
      case "tags":
        mapped.tags = splitTags(value);
        break;
      case "whatsapp.optIn":
        mapped.whatsappOptIn = parseBoolean(value);
        break;
      default:
        break;
    }
  }

  return mapped;
}

function applyTransform(value: string, transform: ImportFieldMapping["transform"]): string {
  if (transform === "trim") {
    return value.trim();
  }
  if (transform === "lowercase") {
    return value.toLowerCase();
  }
  return value;
}

function splitTags(value: string): string[] {
  return value
    .split(/[;,|]/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function parseBoolean(value: string): boolean | undefined {
  const normalized = value.trim().toLowerCase();
  if (normalized === "") {
    return undefined;
  }
  if (["true", "1", "yes", "y"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no", "n"].includes(normalized)) {
    return false;
  }
  return undefined;
}
