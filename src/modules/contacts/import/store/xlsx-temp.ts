import { readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { IMPORT_XLSX_TEMP_MAX_AGE_MS } from "../constants/import.constant.js";

const TEMP_PREFIX = "import-xlsx-";

export async function sweepOrphanXlsxTemp(
  rootDir: string,
  maxAgeMs: number = IMPORT_XLSX_TEMP_MAX_AGE_MS,
  nowMs: number = Date.now(),
): Promise<number> {
  let entries: string[];
  try {
    entries = await readdir(rootDir);
  } catch {
    return 0;
  }
  let removed = 0;
  for (const name of entries) {
    if (!name.startsWith(TEMP_PREFIX)) {
      continue;
    }
    const full = path.join(rootDir, name);
    try {
      const info = await stat(full);
      if (nowMs - info.mtimeMs < maxAgeMs) {
        continue;
      }
      await rm(full, { recursive: true, force: true });
      removed += 1;
    } catch {
      continue;
    }
  }
  return removed;
}
