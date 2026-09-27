import { ZodError } from "zod";
import { HttpError } from "../../../../utils/http.error.js";
import {
  IMPORT_ERROR_CODE,
  IMPORT_ERROR_HTTP,
  IMPORT_MAX_FILE_BYTES,
} from "../constants/import.constant.js";
import {
  CreateImportRequestSchema,
  DryRunRequestSchema,
  StartImportRequestSchema,
  type CreateImportRequest,
  type DryRunRequest,
  type StartImportRequest,
} from "../types/import.types.js";

function firstZodMessage(error: ZodError): string {
  const issue = error.issues[0];
  return issue ? issue.message : "Invalid import payload";
}

function isFileTooLarge(error: ZodError): boolean {
  return error.issues.some(
    (issue) =>
      issue.path.includes("fileSize") &&
      issue.code === "too_big",
  );
}

function isUnsupportedType(error: ZodError): boolean {
  return error.issues.some((issue) => issue.path.includes("mimeType"));
}

export function parseCreateImportRequest(input: unknown): CreateImportRequest {
  const parsed = CreateImportRequestSchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }
  if (isFileTooLarge(parsed.error)) {
    throw HttpError.badRequest(
      `File exceeds ${IMPORT_MAX_FILE_BYTES} bytes`,
      parsed.error.flatten(),
      IMPORT_ERROR_CODE.IMPORT_FILE_TOO_LARGE,
    );
  }
  if (isUnsupportedType(parsed.error)) {
    throw HttpError.badRequest(
      "Unsupported import file type",
      parsed.error.flatten(),
      IMPORT_ERROR_CODE.IMPORT_UNSUPPORTED_TYPE,
    );
  }
  throw HttpError.badRequest(
    firstZodMessage(parsed.error),
    parsed.error.flatten(),
  );
}

export function parseStartImportRequest(input: unknown): StartImportRequest {
  const parsed = StartImportRequestSchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }
  if (isDefaultCountryIssue(parsed.error)) {
    throw HttpError.badRequest(
      "defaultCountry is required and must be a 2-letter ISO country code",
      parsed.error.flatten(),
      IMPORT_ERROR_CODE.IMPORT_DEFAULT_COUNTRY_REQUIRED,
    );
  }
  throw HttpError.badRequest(
    firstZodMessage(parsed.error),
    parsed.error.flatten(),
  );
}

export function parseDryRunRequest(input: unknown): DryRunRequest {
  const parsed = DryRunRequestSchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }
  if (isDefaultCountryIssue(parsed.error)) {
    throw HttpError.badRequest(
      "defaultCountry is required and must be a 2-letter ISO country code",
      parsed.error.flatten(),
      IMPORT_ERROR_CODE.IMPORT_DEFAULT_COUNTRY_REQUIRED,
    );
  }
  throw HttpError.badRequest(
    firstZodMessage(parsed.error),
    parsed.error.flatten(),
  );
}

function isDefaultCountryIssue(error: ZodError): boolean {
  return error.issues.some((issue) => issue.path[0] === "defaultCountry");
}

export function importErrorStatus(
  code: keyof typeof IMPORT_ERROR_HTTP,
): number {
  return IMPORT_ERROR_HTTP[code];
}
