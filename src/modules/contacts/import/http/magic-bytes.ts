import { IMPORT_ERROR_CODE } from "../constants/import.constant.js";
import { PermanentError } from "../errors/import-worker.errors.js";
import { isOle2Magic, isXlsxMagic } from "../parser/xlsx-to-csv.js";

export function assertImportMagic(probe: Buffer): "csv" | "xlsx" {
  if (isOle2Magic(probe)) {
    throw new PermanentError(
      "This file is a password-protected or legacy .xls. Save as .xlsx or CSV.",
      IMPORT_ERROR_CODE.IMPORT_UNSUPPORTED_TYPE,
    );
  }
  if (isXlsxMagic(probe)) {
    return "xlsx";
  }
  if (probe.includes(0)) {
    throw new PermanentError(
      "CSV file contains NUL bytes",
      IMPORT_ERROR_CODE.IMPORT_UNSUPPORTED_TYPE,
    );
  }
  return "csv";
}
