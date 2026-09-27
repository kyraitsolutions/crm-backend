import {
  IMPORT_CSV_DELIMITERS,
  IMPORT_ERROR_CODE,
  IMPORT_MAX_COLUMNS,
  IMPORT_MAX_ROW_BYTES,
  IMPORT_ROW_REASON,
  IMPORT_SNIFF_BYTES,
} from "../constants/import.constant.js";
import { PermanentError } from "../errors/import-worker.errors.js";

export type CsvDelimiter = (typeof IMPORT_CSV_DELIMITERS)[number];

export interface CsvParseOptions {
  delimiter: CsvDelimiter;
  maxRowBytes?: number;
  maxColumns?: number;
  skipHeader?: boolean;
  firstRowNumber?: number;
  startByte?: number;
}

export interface CsvRowIssue {
  code: string;
  column?: string;
  rawValue?: string;
}

export interface CsvRow {
  rowNumber: number;
  fields: string[];
  startByte: number;
  endByte: number;
  error?: CsvRowIssue;
}

const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);
const UTF16LE_BOM = Buffer.from([0xff, 0xfe]);
const UTF16BE_BOM = Buffer.from([0xfe, 0xff]);

const decoder = new TextDecoder("utf-8", { fatal: true });

export function detectBom(buffer: Buffer): { encoding: "utf-8"; hasBom: boolean; skip: number } {
  if (buffer.length >= 2 && buffer.subarray(0, 2).equals(UTF16LE_BOM)) {
    throw new PermanentError(
      "UTF-16LE is not supported; re-export as UTF-8",
      IMPORT_ERROR_CODE.IMPORT_UNSUPPORTED_ENCODING,
    );
  }
  if (buffer.length >= 2 && buffer.subarray(0, 2).equals(UTF16BE_BOM)) {
    throw new PermanentError(
      "UTF-16BE is not supported; re-export as UTF-8",
      IMPORT_ERROR_CODE.IMPORT_UNSUPPORTED_ENCODING,
    );
  }
  if (buffer.length >= 3 && buffer.subarray(0, 3).equals(UTF8_BOM)) {
    return { encoding: "utf-8", hasBom: true, skip: 3 };
  }
  return { encoding: "utf-8", hasBom: false, skip: 0 };
}

export function sniffDelimiter(sample: string): CsvDelimiter {
  let best: CsvDelimiter = ",";
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const delimiter of IMPORT_CSV_DELIMITERS) {
    const score = scoreDelimiter(sample, delimiter);
    if (score > bestScore) {
      bestScore = score;
      best = delimiter;
    }
  }
  return best;
}

function scoreDelimiter(sample: string, delimiter: string): number {
  const rows = parseSampleRows(sample, delimiter, 12);
  if (rows.length === 0) {
    return Number.NEGATIVE_INFINITY;
  }
  const counts = rows.map((row) => row.length);
  const mean = counts.reduce((sum, count) => sum + count, 0) / counts.length;
  if (mean < 1.5) {
    return 0;
  }
  const variance =
    counts.reduce((sum, count) => sum + (count - mean) ** 2, 0) / counts.length;
  return mean * 8 - variance;
}

function parseSampleRows(sample: string, delimiter: string, limit: number): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let index = 0; index < sample.length; index += 1) {
    const char = sample[index] ?? "";
    if (inQuotes) {
      if (char === "\"") {
        const next = sample[index + 1];
        if (next === "\"") {
          field += "\"";
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === "\"") {
      inQuotes = true;
      continue;
    }
    if (char === delimiter) {
      row.push(field);
      field = "";
      continue;
    }
    if (char === "\n" || char === "\r") {
      if (char === "\r" && sample[index + 1] === "\n") {
        index += 1;
      }
      row.push(field);
      field = "";
      if (row.some((value) => value.length > 0)) {
        rows.push(row);
      }
      row = [];
      if (rows.length >= limit) {
        return rows;
      }
      continue;
    }
    field += char;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((value) => value.length > 0)) {
      rows.push(row);
    }
  }
  return rows;
}

export async function* parseCsvStream(
  source: AsyncIterable<Buffer>,
  options: CsvParseOptions,
): AsyncGenerator<CsvRow> {
  const delimiterByte = Buffer.from(options.delimiter, "utf8")[0];
  if (delimiterByte === undefined) {
    throw new PermanentError("Invalid delimiter", IMPORT_ERROR_CODE.IMPORT_UNSUPPORTED_TYPE);
  }
  const maxRowBytes = options.maxRowBytes ?? IMPORT_MAX_ROW_BYTES;
  const maxColumns = options.maxColumns ?? IMPORT_MAX_COLUMNS;
  const skipHeader = options.skipHeader ?? false;
  let nextRowNumber = options.firstRowNumber ?? 1;
  let filePos = options.startByte ?? 0;
  let headerSkipped = !skipHeader;

  let inQuotes = false;
  let quotePending = false;
  let pendingCR = false;
  let sawContent = false;
  let rowTooLarge = false;
  let rowStart = filePos;
  let rowBytes = 0;
  let fieldBytes: number[] = [];
  let fields: string[] = [];

  const decodeField = (bytes: number[]): string => {
    if (bytes.length === 0) {
      return "";
    }
    try {
      return decoder.decode(Uint8Array.from(bytes));
    } catch {
      throw new PermanentError(
        "File is not valid UTF-8",
        IMPORT_ERROR_CODE.IMPORT_UNSUPPORTED_ENCODING,
      );
    }
  };

  const finishField = (): void => {
    fields.push(decodeField(fieldBytes));
    fieldBytes = [];
  };

  const emitRow = function* (endByte: number): Generator<CsvRow> {
    finishField();
    const rowFields = fields;
    const startByte = rowStart;
    const issue = rowTooLarge
      ? { code: IMPORT_ROW_REASON.ROW_TOO_LARGE }
      : rowFields.length > maxColumns
        ? { code: IMPORT_ROW_REASON.TOO_MANY_COLUMNS }
        : undefined;
    fields = [];
    rowTooLarge = false;
    rowBytes = 0;
    inQuotes = false;
    rowStart = endByte;
    const hasContent = rowFields.some((value) => value.length > 0);
    if (!hasContent && rowFields.length <= 1) {
      return;
    }
    if (!headerSkipped) {
      headerSkipped = true;
      return;
    }
    const rowNumber = nextRowNumber;
    nextRowNumber += 1;
    yield {
      rowNumber,
      fields: rowFields,
      startByte,
      endByte,
      error: issue,
    };
  };

  const consume = function* (byte: number): Generator<CsvRow> {
    sawContent = true;
    filePos += 1;
    rowBytes += 1;
    if (rowBytes > maxRowBytes) {
      rowTooLarge = true;
    }

    if (quotePending) {
      quotePending = false;
      if (byte === 0x22) {
        inQuotes = true;
        if (!rowTooLarge) {
          fieldBytes.push(0x22);
        }
        return;
      }
    }

    if (inQuotes) {
      if (byte === 0x22) {
        inQuotes = false;
        quotePending = true;
        return;
      }
      if (!rowTooLarge) {
        fieldBytes.push(byte);
      }
      return;
    }

    if (pendingCR) {
      pendingCR = false;
      if (byte === 0x0a) {
        yield* emitRow(filePos);
        return;
      }
      yield* emitRow(filePos - 1);
    }

    if (byte === 0x22 && fieldBytes.length === 0) {
      inQuotes = true;
      return;
    }
    if (byte === delimiterByte) {
      finishField();
      return;
    }
    if (byte === 0x0a) {
      yield* emitRow(filePos);
      return;
    }
    if (byte === 0x0d) {
      pendingCR = true;
      return;
    }
    if (!rowTooLarge) {
      fieldBytes.push(byte);
    }
  };

  let isFirstChunk = filePos === 0;
  for await (const chunk of source) {
    let offset = 0;
    if (isFirstChunk) {
      const detected = detectBom(chunk);
      offset = detected.skip;
      filePos += detected.skip;
      rowStart = filePos;
      isFirstChunk = false;
    }
    for (let index = offset; index < chunk.length; index += 1) {
      const byte = chunk[index];
      if (byte === undefined) {
        continue;
      }
      yield* consume(byte);
    }
  }

  if (pendingCR) {
    yield* emitRow(filePos);
    pendingCR = false;
  }
  if (sawContent && (fields.length > 0 || fieldBytes.length > 0 || inQuotes)) {
    yield* emitRow(filePos);
  }
}

export function sniffSampleText(head: Buffer): { text: string; hasBom: boolean; skip: number } {
  const detected = detectBom(head);
  const body = head.subarray(detected.skip, detected.skip + IMPORT_SNIFF_BYTES);
  let text: string;
  try {
    text = decoder.decode(body);
  } catch {
    throw new PermanentError(
      "File is not valid UTF-8",
      IMPORT_ERROR_CODE.IMPORT_UNSUPPORTED_ENCODING,
    );
  }
  return { text, hasBom: detected.hasBom, skip: detected.skip };
}
