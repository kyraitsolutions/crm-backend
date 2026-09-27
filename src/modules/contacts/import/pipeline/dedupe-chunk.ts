import type { DuplicatePolicy } from "../types/import.types.js";
import type { ValidatedContact } from "./validate-row.js";

export interface ChunkRow {
  rowNumber: number;
  raw: string[];
  contact: ValidatedContact;
}

export interface DedupeResult {
  winners: ChunkRow[];
  skipped: number;
}

export function identityKey(contact: ValidatedContact): string {
  return `${contact.identityField}:${contact.identityValue}`;
}

export function dedupeChunk(rows: ChunkRow[], policy: DuplicatePolicy): DedupeResult {
  const byKey = new Map<string, ChunkRow>();
  let skipped = 0;
  for (const row of rows) {
    const key = identityKey(row.contact);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, row);
      continue;
    }
    if (policy === "skip") {
      skipped += 1;
      continue;
    }
    byKey.set(key, row);
    skipped += 1;
  }
  return { winners: [...byKey.values()], skipped };
}
