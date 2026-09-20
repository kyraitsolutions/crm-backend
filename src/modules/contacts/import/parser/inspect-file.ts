import {
  IMPORT_ERROR_CODE,
  IMPORT_HEAD_BYTES,
  IMPORT_INSPECT_SAMPLE_ROWS,
} from "../constants/import.constant.js";
import { PermanentError } from "../errors/import-worker.errors.js";
import type { FileStore } from "../store/file-store.js";
import {
  parseCsvStream,
  sniffDelimiter,
  sniffSampleText,
  type CsvDelimiter,
} from "./csv-reader.js";
import {
  isOle2Magic,
  isXlsxMagic,
  materializeCanonicalCsv,
  OLE2_REJECT_MESSAGE,
  type XlsxConvertOptions,
  type XlsxConvertResult,
} from "./xlsx-to-csv.js";

export interface InspectFileResult {
  delimiter: CsvDelimiter;
  hasBom: boolean;
  encoding: "utf-8";
  headers: string[];
  sampleRows: string[][];
  size: number;
  sourceKey: string;
  kind: "csv" | "xlsx";
  sheetNames?: string[];
  sheetName?: string;
  date1904?: boolean;
}

export async function inspectFile(
  store: FileStore,
  key: string,
  options: XlsxConvertOptions = {},
): Promise<InspectFileResult> {
  const size = await store.size(key);
  if (size === 0) {
    throw new PermanentError("Import file is empty", IMPORT_ERROR_CODE.IMPORT_EMPTY);
  }

  const probe = await readRange(store, key, 0, Math.min(8, size) - 1);
  if (isOle2Magic(probe)) {
    throw new PermanentError(OLE2_REJECT_MESSAGE, IMPORT_ERROR_CODE.IMPORT_UNSUPPORTED_TYPE);
  }
  if (isXlsxMagic(probe)) {
    const csvKey = canonicalCsvKey(key);
    let converted: XlsxConvertResult | undefined;
    if (!(await store.exists(csvKey))) {
      converted = await materializeCanonicalCsv(store, key, csvKey, options);
    }
    const inspected = await inspectCsv(store, csvKey);
    return {
      ...inspected,
      kind: "xlsx",
      sourceKey: csvKey,
      sheetNames: converted?.sheetNames,
      sheetName: converted?.sheetName,
      date1904: converted?.date1904,
    };
  }

  const inspected = await inspectCsv(store, key);
  return { ...inspected, kind: "csv", sourceKey: key };
}

export function canonicalCsvKey(sourceKey: string): string {
  return `${sourceKey}.canonical.csv`;
}

async function inspectCsv(
  store: FileStore,
  key: string,
): Promise<Omit<InspectFileResult, "kind" | "sourceKey"> & { sourceKey: string; kind: "csv" }> {
  const size = await store.size(key);
  if (size === 0) {
    throw new PermanentError("Import file is empty", IMPORT_ERROR_CODE.IMPORT_EMPTY);
  }
  const headEnd = Math.min(size, IMPORT_HEAD_BYTES) - 1;
  const head = await readRange(store, key, 0, headEnd);
  const sniffed = sniffSampleText(head);
  const delimiter = sniffDelimiter(sniffed.text);

  const rows: string[][] = [];
  const stream = await store.createReadStream(key, { start: 0, end: headEnd });
  for await (const row of parseCsvStream(stream, {
    delimiter,
    skipHeader: false,
    firstRowNumber: 0,
  })) {
    rows.push(row.fields);
    if (rows.length >= IMPORT_INSPECT_SAMPLE_ROWS + 1) {
      break;
    }
  }

  const headers = rows[0];
  if (!headers || headers.length === 0 || headers.every((value) => value.trim() === "")) {
    throw new PermanentError("Import file is empty", IMPORT_ERROR_CODE.IMPORT_EMPTY);
  }

  return {
    delimiter,
    hasBom: sniffed.hasBom,
    encoding: "utf-8",
    headers,
    sampleRows: rows.slice(1, IMPORT_INSPECT_SAMPLE_ROWS + 1),
    size,
    sourceKey: key,
    kind: "csv",
  };
}

export async function readRange(
  store: FileStore,
  key: string,
  start: number,
  end: number,
): Promise<Buffer> {
  if (end < start) {
    return Buffer.alloc(0);
  }
  const stream = await store.createReadStream(key, { start, end });
  const parts: Buffer[] = [];
  for await (const chunk of stream) {
    parts.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(parts);
}
