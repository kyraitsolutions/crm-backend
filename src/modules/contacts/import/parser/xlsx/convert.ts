import { randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdtemp, rename, rm, unlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import {
  IMPORT_ERROR_CODE,
  xlsxFileByteLimit,
  xlsxTooLargeMessage,
} from "../../constants/import.constant.js";
import { PermanentError } from "../../errors/import-worker.errors.js";
import type { FileStore } from "../../store/file-store.js";
import { chooseSheet, loadWorkbook } from "./workbook.js";
import { loadSharedStrings } from "./shared-strings.js";
import { writeSheetCsv } from "./sheet-csv.js";
import { loadStyles } from "./styles.js";
import { openXlsxZip } from "./zip-reader.js";

const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const OLE2_MAGIC = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

export function isXlsxMagic(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer.subarray(0, 4).equals(ZIP_MAGIC);
}

export function isOle2Magic(buffer: Buffer): boolean {
  return buffer.length >= 8 && buffer.subarray(0, 8).equals(OLE2_MAGIC);
}

export const OLE2_REJECT_MESSAGE =
  "This file is a password-protected or legacy .xls. Save as .xlsx or CSV.";

export interface XlsxConvertOptions {
  tempDir?: string;
  maxFileBytes?: number;
  sheetName?: string;
  onHeartbeat?: () => Promise<void> | void;
  onProgress?: (progress: { rowsEmitted: number }) => Promise<void> | void;
}

export interface XlsxConvertResult {
  sheetNames: string[];
  sheetName: string;
  date1904: boolean;
  rowsEmitted: number;
}

export async function materializeCanonicalCsv(
  store: FileStore,
  sourceKey: string,
  destKey: string,
  options: XlsxConvertOptions = {},
): Promise<XlsxConvertResult> {
  const baseDir = options.tempDir ?? os.tmpdir();
  const tempRoot = await mkdtemp(path.join(baseDir, "import-xlsx-"));
  const zipPath = path.join(tempRoot, "source.xlsx");
  const csvPath = path.join(tempRoot, "canonical.csv");
  const maxFileBytes = options.maxFileBytes ?? xlsxFileByteLimit();
  try {
    await copyStoreObjectToFile(store, sourceKey, zipPath, maxFileBytes);
    const converted = await convertXlsxFile(zipPath, csvPath, options);
    await store.putStream(destKey, createReadStream(csvPath));
    return converted;
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

export async function convertXlsxFile(
  zipPath: string,
  csvPath: string,
  options: XlsxConvertOptions = {},
): Promise<XlsxConvertResult> {
  const zip = await openXlsxZip(zipPath);
  const workbook = await loadWorkbook(zip);
  if (workbook.sheets.length === 0) {
    throw new PermanentError("XLSX has no worksheet", IMPORT_ERROR_CODE.IMPORT_EMPTY);
  }
  const chosen = chooseSheet(workbook, options.sheetName);
  const shared = await loadSharedStrings(zip);
  const styles = await loadStyles(zip);
  const sheetStream = await zip.streamXml(chosen.path);
  const partPath = `${csvPath}.${randomUUID()}.part`;
  try {
    const rowsEmitted = await writeSheetCsv(sheetStream, shared, styles, partPath, {
      date1904: workbook.date1904,
      onHeartbeat: options.onHeartbeat,
      onProgress: options.onProgress,
    });
    await rename(partPath, csvPath);
    return {
      sheetNames: workbook.sheets.map((sheet) => sheet.name),
      sheetName: chosen.name,
      date1904: workbook.date1904,
      rowsEmitted,
    };
  } catch (error) {
    await unlink(partPath).catch(() => undefined);
    throw error;
  }
}

async function copyStoreObjectToFile(
  store: FileStore,
  key: string,
  dest: string,
  maxBytes: number,
): Promise<void> {
  const size = await store.size(key);
  if (size > maxBytes) {
    throw new PermanentError(
      xlsxTooLargeMessage("file"),
      IMPORT_ERROR_CODE.IMPORT_UNSUPPORTED_TYPE,
    );
  }
  const stream = await store.createReadStream(key);
  let written = 0;
  const out = createWriteStream(dest);
  stream.on("data", (chunk: Buffer | string) => {
    written += Buffer.byteLength(chunk);
    if (written > maxBytes) {
      stream.destroy();
      out.destroy();
    }
  });
  try {
    await pipeline(stream, out);
  } catch (error) {
    if (written > maxBytes) {
      throw new PermanentError(
        xlsxTooLargeMessage("file"),
        IMPORT_ERROR_CODE.IMPORT_UNSUPPORTED_TYPE,
      );
    }
    throw error;
  }
}
