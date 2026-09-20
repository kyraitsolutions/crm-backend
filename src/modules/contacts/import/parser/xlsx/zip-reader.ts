import { Readable } from "node:stream";
import yauzl from "yauzl";
import {
  IMPORT_ERROR_CODE,
  xlsxEntryByteLimit,
  xlsxEntryLimit,
  xlsxRatioLimit,
  xlsxUncompressedLimit,
} from "../../constants/import.constant.js";
import { PermanentError } from "../../errors/import-worker.errors.js";
import { CountingLimit, type ZipByteBudget } from "./byte-budget.js";
import { XmlSecurityGuard } from "./xml-guard.js";

export interface ZipEntryMeta {
  fileName: string;
  compressedSize: number;
  uncompressedSize: number;
}

export interface OpenedXlsxZip {
  entries: ZipEntryMeta[];
  readXml(fileName: string): Promise<Buffer>;
  streamXml(fileName: string): Promise<Readable>;
  close(): void;
}

const ENCRYPTED_NAMES = new Set(["EncryptedPackage", "EncryptionInfo"]);

export async function openXlsxZip(zipPath: string): Promise<OpenedXlsxZip> {
  const listed = await listEntries(zipPath);
  assertDeclaredBudget(listed);
  if (listed.some((entry) => ENCRYPTED_NAMES.has(entry.fileName.split("/").pop() ?? ""))) {
    throw new PermanentError(
      "This file is a password-protected or legacy .xls. Save as .xlsx or CSV.",
      IMPORT_ERROR_CODE.IMPORT_UNSUPPORTED_TYPE,
    );
  }
  const budget: ZipByteBudget = {
    totalUsed: 0,
    totalMax: xlsxUncompressedLimit(),
    ratioMax: xlsxRatioLimit(),
  };
  return {
    entries: listed,
    readXml: (fileName) => readNamedXml(zipPath, fileName, budget),
    streamXml: (fileName) => streamNamedXml(zipPath, fileName, budget),
    close: () => undefined,
  };
}

function assertDeclaredBudget(entries: ZipEntryMeta[]): void {
  if (entries.length > xlsxEntryLimit()) {
    throw new PermanentError("XLSX has too many zip entries", IMPORT_ERROR_CODE.IMPORT_ZIP_BOMB);
  }
  const uncompressed = entries.reduce((sum, entry) => sum + entry.uncompressedSize, 0);
  const compressed = entries.reduce((sum, entry) => sum + Math.max(entry.compressedSize, 1), 0);
  if (uncompressed > xlsxUncompressedLimit()) {
    throw new PermanentError("XLSX uncompressed size exceeds cap", IMPORT_ERROR_CODE.IMPORT_ZIP_BOMB);
  }
  if (uncompressed / compressed > xlsxRatioLimit()) {
    throw new PermanentError("XLSX compression ratio exceeds cap", IMPORT_ERROR_CODE.IMPORT_ZIP_BOMB);
  }
}

function listEntries(zipPath: string): Promise<ZipEntryMeta[]> {
  return new Promise((resolve, reject) => {
    openZip(zipPath)
      .then((zip) => {
        const entries: ZipEntryMeta[] = [];
        zip.on("error", (error) => {
          zip.close();
          reject(asZipError(error));
        });
        zip.on("entry", (entry: yauzl.Entry) => {
          entries.push({
            fileName: normalizeZipName(entry.fileName),
            compressedSize: entry.compressedSize,
            uncompressedSize: entry.uncompressedSize,
          });
          zip.readEntry();
        });
        zip.on("end", () => {
          zip.close();
          resolve(entries);
        });
        zip.readEntry();
      })
      .catch(reject);
  });
}

async function readNamedXml(
  zipPath: string,
  fileName: string,
  budget: ZipByteBudget,
): Promise<Buffer> {
  const stream = await streamNamedXml(zipPath, fileName, budget);
  const parts: Buffer[] = [];
  for await (const chunk of stream) {
    parts.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(parts);
}

function streamNamedXml(
  zipPath: string,
  fileName: string,
  budget: ZipByteBudget,
): Promise<Readable> {
  const wanted = normalizeZipName(fileName);
  return new Promise((resolve, reject) => {
    openZip(zipPath)
      .then((zip) => {
        let settled = false;
        const fail = (error: unknown): void => {
          if (settled) {
            return;
          }
          settled = true;
          zip.close();
          reject(asZipError(error));
        };
        zip.on("error", fail);
        zip.on("entry", (entry: yauzl.Entry) => {
          if (normalizeZipName(entry.fileName) !== wanted) {
            zip.readEntry();
            return;
          }
          zip.openReadStream(entry, (error, raw) => {
            if (error || !raw) {
              fail(error ?? new Error(`Unable to read ${fileName}`));
              return;
            }
            const limited = new CountingLimit(
              xlsxEntryByteLimit(),
              budget,
              entry.compressedSize,
              entry.uncompressedSize,
            );
            const guarded = new XmlSecurityGuard();
            const output = raw.pipe(limited).pipe(guarded);
            output.on("error", fail);
            raw.on("error", fail);
            output.on("end", () => {
              zip.close();
            });
            settled = true;
            resolve(output);
          });
        });
        zip.on("end", () => {
          if (!settled) {
            fail(
              new PermanentError(
                `Missing ${fileName}`,
                IMPORT_ERROR_CODE.IMPORT_UNSUPPORTED_TYPE,
              ),
            );
          }
        });
        zip.readEntry();
      })
      .catch(reject);
  });
}

function openZip(zipPath: string): Promise<yauzl.ZipFile> {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true, validateEntrySizes: true }, (error, zip) => {
      if (error || !zip) {
        reject(asZipError(error ?? new Error("Invalid XLSX zip")));
        return;
      }
      resolve(zip);
    });
  });
}

function normalizeZipName(name: string): string {
  return name.replace(/\\/g, "/").replace(/^\.\//, "");
}

function asZipError(error: unknown): Error {
  if (error instanceof PermanentError) {
    return error;
  }
  const message = error instanceof Error ? error.message : "Invalid or corrupted XLSX zip";
  if (/invalid|corrupt|uncompressed size|entry size/i.test(message)) {
    return new PermanentError(message, IMPORT_ERROR_CODE.IMPORT_ZIP_BOMB);
  }
  return new PermanentError(message, IMPORT_ERROR_CODE.IMPORT_UNSUPPORTED_TYPE);
}
