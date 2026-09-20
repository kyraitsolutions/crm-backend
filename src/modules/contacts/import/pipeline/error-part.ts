import { Readable } from "node:stream";
import type { FileStore } from "../store/file-store.js";
import type { ImportRowError } from "../types/import.types.js";
import { csvLine, sanitizeFormulaCell } from "../parser/csv-format.js";

export function errorPartKey(jobId: string, chunkIndex: number): string {
  return `errors/${jobId}/${chunkIndex}.csv`;
}

export async function writeErrorPart(
  store: FileStore,
  jobId: string,
  chunkIndex: number,
  errors: ImportRowError[],
): Promise<string> {
  const key = errorPartKey(jobId, chunkIndex);
  const header = csvLine(["rowNumber", "reason", "column", "rawValue", "raw"]);
  const lines = errors.map((error) =>
    csvLine([
      sanitizeFormulaCell(String(error.rowNumber)),
      sanitizeFormulaCell(error.reason),
      sanitizeFormulaCell(error.column ?? ""),
      sanitizeFormulaCell(error.rawValue ?? ""),
      sanitizeFormulaCell(error.raw.join("\t")),
    ]),
  );
  await store.putStream(key, Readable.from([header, ...lines]));
  return key;
}
