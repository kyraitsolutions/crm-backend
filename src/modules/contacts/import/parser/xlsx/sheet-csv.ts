import { createWriteStream, type WriteStream } from "node:fs";
import type { Readable } from "node:stream";
import sax from "sax";
import {
  IMPORT_ERROR_CODE,
  xlsxColumnLimit,
  xlsxRowLimit,
  xlsxTooLargeMessage,
} from "../../constants/import.constant.js";
import { PermanentError } from "../../errors/import-worker.errors.js";
import { csvLine } from "../csv-format.js";
import { excelSerialToIso } from "./excel-date.js";
import { formatExcelNumber } from "./excel-number.js";
import type { SharedStringTable } from "./shared-strings.js";
import type { StyleTable } from "./styles.js";
import { attributeValue, localName } from "./xml-names.js";

const YIELD_EVERY = 2_000;

export interface SheetCsvProgress {
  rowsEmitted: number;
}

export interface WriteSheetCsvOptions {
  date1904: boolean;
  onHeartbeat?: () => Promise<void> | void;
  onProgress?: (progress: SheetCsvProgress) => Promise<void> | void;
}

export async function writeSheetCsv(
  sheetStream: Readable,
  shared: SharedStringTable,
  styles: StyleTable,
  destPath: string,
  options: WriteSheetCsvOptions,
): Promise<number> {
  const out = createWriteStream(destPath);
  const parser = sax.parser(true, { trim: false, normalize: false });
  const rowLimit = xlsxRowLimit();

  let cells: string[] = [];
  let currentCol = -1;
  let cellType = "";
  let styleId: number | undefined;
  let text = "";
  let inValue = false;
  let inInline = false;
  let inPhonetic = false;
  let rowsSeen = 0;
  let rowsEmitted = 0;
  let writeChain = Promise.resolve();

  const emitRow = (fields: string[]): void => {
    const line = csvLine(fields);
    writeChain = writeChain.then(async () => {
      if (out.destroyed || out.closed) {
        return;
      }
      const ok = out.write(line);
      if (!ok) {
        await waitForWritable(out);
      }
    });
  };

  const yieldProgress = async (): Promise<void> => {
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
    if (options.onHeartbeat) {
      await options.onHeartbeat();
    }
    if (options.onProgress) {
      await options.onProgress({ rowsEmitted });
    }
  };

  parser.onopentag = (node) => {
    const name = localName(node.name);
    if (name === "row") {
      cells = [];
      currentCol = -1;
    }
    if (name === "c") {
      cellType = attributeValue(node.attributes, "t") ?? "";
      const styleRaw = attributeValue(node.attributes, "s");
      styleId = styleRaw === undefined ? undefined : Number(styleRaw);
      text = "";
      const ref = attributeValue(node.attributes, "r");
      const col = ref ? parseCellRef(ref).col : currentCol + 1;
      const columnLimit = xlsxColumnLimit();
      if (col >= columnLimit) {
        throw new PermanentError(
          `XLSX exceeds the ${columnLimit} column limit. Please upload a CSV instead.`,
          IMPORT_ERROR_CODE.IMPORT_UNSUPPORTED_TYPE,
        );
      }
      while (cells.length <= col) {
        cells.push("");
      }
      currentCol = col;
    }
    if (name === "rPh") {
      inPhonetic = true;
    }
    if (name === "v") {
      inValue = true;
    }
    if (name === "t" && !inPhonetic) {
      inInline = true;
    }
  };

  parser.ontext = (value) => {
    if ((inValue || inInline) && !inPhonetic) {
      text += value;
    }
  };

  parser.onclosetag = (rawName) => {
    const name = localName(rawName);
    if (name === "v") {
      inValue = false;
    }
    if (name === "t") {
      inInline = false;
    }
    if (name === "rPh") {
      inPhonetic = false;
    }
    if (name === "c") {
      const formatted = formatCell(text, cellType, styleId, shared, styles, options.date1904);
      if (currentCol >= 0) {
        cells[currentCol] = formatted;
      }
      text = "";
      cellType = "";
      styleId = undefined;
    }
    if (name === "row") {
      rowsSeen += 1;
      if (rowsSeen > rowLimit + 1) {
        throw new PermanentError(
          xlsxTooLargeMessage("rows"),
          IMPORT_ERROR_CODE.IMPORT_UNSUPPORTED_TYPE,
        );
      }
      if (cells.some((cell) => cell.length > 0)) {
        rowsEmitted += 1;
        if (rowsEmitted > rowLimit + 1) {
          throw new PermanentError(
            xlsxTooLargeMessage("rows"),
            IMPORT_ERROR_CODE.IMPORT_UNSUPPORTED_TYPE,
          );
        }
        emitRow(cells);
      }
    }
  };

  try {
    let lastYieldAt = 0;
    for await (const chunk of sheetStream) {
      parser.write(Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk));
      await writeChain;
      if (rowsEmitted - lastYieldAt >= YIELD_EVERY) {
        lastYieldAt = rowsEmitted;
        await yieldProgress();
      }
    }
    parser.close();
    await writeChain;
    if (rowsEmitted > lastYieldAt) {
      await yieldProgress();
    }
    await new Promise<void>((resolve, reject) => {
      out.end((error: Error | null | undefined) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  } catch (error) {
    out.destroy();
    throw error;
  }

  if (rowsEmitted === 0) {
    throw new PermanentError("XLSX sheet is empty", IMPORT_ERROR_CODE.IMPORT_EMPTY);
  }
  return rowsEmitted;
}

async function waitForWritable(out: WriteStream): Promise<void> {
  if (out.destroyed || out.closed) {
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const finish = (): void => {
      out.off("drain", finish);
      out.off("close", finish);
      out.off("error", onError);
      resolve();
    };
    const onError = (error: Error): void => {
      out.off("drain", finish);
      out.off("close", finish);
      out.off("error", onError);
      reject(error);
    };
    out.once("drain", finish);
    out.once("close", finish);
    out.once("error", onError);
  });
}

function formatCell(
  raw: string,
  cellType: string,
  styleId: number | undefined,
  shared: SharedStringTable,
  styles: StyleTable,
  date1904: boolean,
): string {
  if (cellType === "s") {
    return shared.get(Number(raw));
  }
  if (cellType === "inlineStr" || cellType === "str") {
    return raw;
  }
  if (cellType === "b") {
    return raw === "1" || raw.toLowerCase() === "true" ? "TRUE" : "FALSE";
  }
  if (cellType === "e") {
    return "";
  }
  if (cellType === "d") {
    return raw;
  }
  if (raw.trim() === "") {
    return "";
  }
  if (styles.isDateStyle(styleId)) {
    const serial = Number(raw);
    if (Number.isFinite(serial)) {
      return excelSerialToIso(serial, date1904);
    }
  }
  if (cellType === "n" || cellType === "") {
    return formatExcelNumber(raw);
  }
  return raw;
}

export function parseCellRef(ref: string): { col: number; row: number } {
  let col = 0;
  let index = 0;
  while (index < ref.length) {
    const code = ref.charCodeAt(index);
    if (code < 65 || code > 90) {
      break;
    }
    col = col * 26 + (code - 64);
    index += 1;
  }
  return { col: col - 1, row: Number(ref.slice(index)) };
}
