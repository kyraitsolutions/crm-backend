import { config } from "../../../../config/index.js";

function importConfig() {
  return config.import;
}

export const IMPORT_STATUS = {
  UPLOADED: "uploaded",
  SCANNING: "scanning",
  VALIDATING: "validating",
  MAPPING: "mapping",
  QUEUED: "queued",
  PROCESSING: "processing",
  PAUSED: "paused",
  COMPLETED: "completed",
  COMPLETED_WITH_ERRORS: "completed_with_errors",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;

export type ImportStatusValue =
  (typeof IMPORT_STATUS)[keyof typeof IMPORT_STATUS];

/**
 * Legal transitions from the architecture state machine.
 * `paused` is in the status enum and pause/resume API; the diagram omitted
 * those edges, so processing ↔ paused and paused → cancelled are included.
 * `processing → processing` on the diagram is a chunk cursor commit, not a
 * status change — that path is completeChunk, not transition().
 */
export const IMPORT_ALLOWED_TRANSITIONS: Record<
  ImportStatusValue,
  readonly ImportStatusValue[]
> = {
  uploaded: [IMPORT_STATUS.SCANNING, IMPORT_STATUS.VALIDATING, IMPORT_STATUS.CANCELLED],
  scanning: [IMPORT_STATUS.VALIDATING, IMPORT_STATUS.FAILED, IMPORT_STATUS.CANCELLED],
  validating: [IMPORT_STATUS.MAPPING, IMPORT_STATUS.FAILED, IMPORT_STATUS.CANCELLED],
  mapping: [IMPORT_STATUS.QUEUED, IMPORT_STATUS.CANCELLED],
  queued: [IMPORT_STATUS.PROCESSING, IMPORT_STATUS.CANCELLED],
  processing: [
    IMPORT_STATUS.COMPLETED,
    IMPORT_STATUS.COMPLETED_WITH_ERRORS,
    IMPORT_STATUS.FAILED,
    IMPORT_STATUS.CANCELLED,
    IMPORT_STATUS.PAUSED,
  ],
  paused: [IMPORT_STATUS.PROCESSING, IMPORT_STATUS.CANCELLED],
  completed: [],
  completed_with_errors: [],
  failed: [],
  cancelled: [],
};

export const IMPORT_CHUNK_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  DONE: "done",
  FAILED: "failed",
} as const;

export type ImportChunkStatusValue =
  (typeof IMPORT_CHUNK_STATUS)[keyof typeof IMPORT_CHUNK_STATUS];

export const DUPLICATE_POLICY = {
  SKIP: "skip",
  UPDATE: "update",
  MERGE: "merge",
} as const;

export const IDENTITY_FIELD = {
  PHONE: "phone",
  EMAIL: "email",
} as const;

export const IMPORT_FIELD_TARGET = {
  NAME: "name",
  EMAIL: "email",
  PHONE: "phone",
  STATUS: "status",
  TAGS: "tags",
  WHATSAPP_OPT_IN: "whatsapp.optIn",
  IGNORE: "ignore",
} as const;

export const IMPORT_FIELD_TRANSFORM = {
  NONE: "none",
  TRIM: "trim",
  LOWERCASE: "lowercase",
} as const;

export const IMPORT_ERROR_CODE = {
  IMPORT_FILE_TOO_LARGE: "IMPORT_FILE_TOO_LARGE",
  IMPORT_UNSUPPORTED_TYPE: "IMPORT_UNSUPPORTED_TYPE",
  IMPORT_UNSUPPORTED_ENCODING: "IMPORT_UNSUPPORTED_ENCODING",
  IMPORT_ZIP_BOMB: "IMPORT_ZIP_BOMB",
  IMPORT_EMPTY: "IMPORT_EMPTY",
  IMPORT_INVALID_STATE: "IMPORT_INVALID_STATE",
  IMPORT_NOT_FOUND: "IMPORT_NOT_FOUND",
  IMPORT_QUOTA_ACTIVE: "IMPORT_QUOTA_ACTIVE",
  IMPORT_TENANT_FAIRNESS: "IMPORT_TENANT_FAIRNESS",
  IMPORT_SCAN_REJECTED: "IMPORT_SCAN_REJECTED",
  CONTACTS_CREATE_FORBIDDEN: "CONTACTS_CREATE_FORBIDDEN",
  FEATURE_NOT_AVAILABLE: "FEATURE_NOT_AVAILABLE",
  IMPORT_RATE_LIMITED: "IMPORT_RATE_LIMITED",
  IMPORT_SIZE_MISMATCH: "IMPORT_SIZE_MISMATCH",
  IMPORT_DEFAULT_COUNTRY_REQUIRED: "IMPORT_DEFAULT_COUNTRY_REQUIRED",
} as const;

export const IMPORT_ROW_REASON = {
  INVALID_PHONE: "INVALID_PHONE",
  INVALID_EMAIL: "INVALID_EMAIL",
  INVALID_IDENTITY: "INVALID_IDENTITY",
  INVALID_STATUS: "INVALID_STATUS",
  CELL_TOO_LARGE: "CELL_TOO_LARGE",
  ROW_TOO_LARGE: "ROW_TOO_LARGE",
  TOO_MANY_COLUMNS: "TOO_MANY_COLUMNS",
  DUPLICATE_OTHER_IDENTITY: "DUPLICATE_OTHER_IDENTITY",
} as const;

export const IMPORT_ERROR_HTTP: Record<
  (typeof IMPORT_ERROR_CODE)[keyof typeof IMPORT_ERROR_CODE],
  number
> = {
  IMPORT_FILE_TOO_LARGE: 400,
  IMPORT_UNSUPPORTED_TYPE: 400,
  IMPORT_UNSUPPORTED_ENCODING: 400,
  IMPORT_ZIP_BOMB: 400,
  IMPORT_EMPTY: 400,
  IMPORT_INVALID_STATE: 400,
  IMPORT_NOT_FOUND: 404,
  IMPORT_QUOTA_ACTIVE: 429,
  IMPORT_TENANT_FAIRNESS: 429,
  IMPORT_SCAN_REJECTED: 400,
  CONTACTS_CREATE_FORBIDDEN: 403,
  FEATURE_NOT_AVAILABLE: 403,
  IMPORT_RATE_LIMITED: 429,
  IMPORT_SIZE_MISMATCH: 400,
  IMPORT_DEFAULT_COUNTRY_REQUIRED: 400,
};

export const IMPORT_CHUNK_ROWS = 1000;
export const IMPORT_CHUNK_MAX_BYTES = 2 * 1024 * 1024;
export const IMPORT_CHUNK_LEASE_MS = 60_000;
export const IMPORT_HEARTBEAT_MS_DEFAULT = 10_000;
export const IMPORT_LEASE_TTL_MULTIPLIER = 3;
export const IMPORT_DISPATCH_K_DEFAULT = 3;
export const IMPORT_ORG_ACTIVE_SLOTS_DEFAULT = 2;
export const IMPORT_WORKER_CONCURRENCY_DEFAULT = 2;
export const IMPORT_CHUNK_ATTEMPTS = 5;
export const IMPORT_BACKOFF_BASE_MS = 2_000;
export const IMPORT_STALL_MAX_MS_DEFAULT = 30 * 60 * 1000;
export const IMPORT_SWEEP_INTERVAL_MS = 60_000;
export const IMPORT_GRACEFUL_SHUTDOWN_MS = 30_000;
export const IMPORT_SOURCE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const IMPORT_ERROR_REPORT_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const IMPORT_CHUNK_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
export const IMPORT_ABANDONED_UPLOAD_MS = 24 * 60 * 60 * 1000;
export const IMPORT_XLSX_TEMP_MAX_AGE_MS = 60 * 60 * 1000;
export const IMPORT_MAX_FILE_BYTES = 250 * 1024 * 1024;
export const IMPORT_MAX_ROWS = 500_000;
export const IMPORT_MAX_ROW_BYTES = 32 * 1024;
export const IMPORT_MAX_CELL_BYTES = 8 * 1024;
export const IMPORT_MAX_COLUMNS = 64;
export const IMPORT_INSPECT_SAMPLE_ROWS = 20;
export const IMPORT_SNIFF_BYTES = 8 * 1024;
export const IMPORT_HEAD_BYTES = 64 * 1024;
export const IMPORT_PRESIGN_EXPIRES_SEC = 900;
export const IMPORT_PROBE_BYTES = 4096;
export const IMPORT_ERROR_DOWNLOAD_EXPIRES_SEC = 300;
export const IMPORT_JOB_TTL_SECONDS = 7_776_000;
export const IMPORT_MAX_ACTIVE_PER_ACCOUNT = 2;
export const IMPORT_MAX_CREATES_PER_HOUR = 20;
export const IMPORT_SSE_HEARTBEAT_MS = 15_000;
export const IMPORT_SSE_POLL_MS = 1_000;
export const IMPORT_SSE_MAX_CONNECTIONS_PER_USER = 4;
export const IMPORT_PERMISSION = "contacts.import";
export { IMPORT_CONSENT_TEXT_VERSION } from "./consent-text.js";
export const IMPORT_MAX_DRY_RUNS_PER_HOUR = 30;
export const IMPORT_DRY_RUN_SAMPLE_DEFAULT = 200;
export const IMPORT_DRY_RUN_SAMPLE_MAX = 200;
export const IMPORT_MAX_XLSX_UNCOMPRESSED = 400 * 1024 * 1024;
export const IMPORT_MAX_XLSX_RATIO = 100;
export const IMPORT_MAX_XLSX_ENTRIES = 64;
export const IMPORT_MAX_SHARED_STRINGS_BYTES = 32 * 1024 * 1024;
export const IMPORT_MAX_XLSX_FILE_BYTES = 250 * 1024 * 1024;
export const IMPORT_MAX_XLSX_ENTRY_BYTES = 250 * 1024 * 1024;
export const IMPORT_MAX_XLSX_ROWS = 500_000;
export const IMPORT_DEFAULT_REGION = "IN";
export const IMPORT_CSV_DELIMITERS = [",", ";", "\t", "|"] as const;

export function maxActiveImportsPerAccount(): number {
  return readEnvInt("IMPORT_MAX_ACTIVE_PER_ACCOUNT", importConfig().maxActivePerAccount);
}

export function maxImportCreatesPerHour(): number {
  return readEnvInt("IMPORT_MAX_CREATES_PER_HOUR", importConfig().maxCreatesPerHour);
}

export function maxDryRunsPerHour(): number {
  return readEnvInt("IMPORT_MAX_DRY_RUNS_PER_HOUR", importConfig().maxDryRunsPerHour);
}

export function sseHeartbeatMs(): number {
  return readEnvInt("IMPORT_SSE_HEARTBEAT_MS", importConfig().sseHeartbeatMs);
}

export function ssePollMs(): number {
  return readEnvInt("IMPORT_SSE_POLL_MS", importConfig().ssePollMs);
}

export function sseMaxConnectionsPerUser(): number {
  return readEnvInt(
    "IMPORT_SSE_MAX_CONNECTIONS_PER_USER",
    importConfig().sseMaxConnectionsPerUser,
  );
}

export function readEnvInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

export function xlsxFileByteLimit(): number {
  return readEnvInt("IMPORT_MAX_XLSX_FILE_BYTES", importConfig().maxXlsxFileBytes);
}

export function xlsxRowLimit(): number {
  return readEnvInt("IMPORT_MAX_XLSX_ROWS", importConfig().maxXlsxRows);
}

export function xlsxUncompressedLimit(): number {
  return readEnvInt("IMPORT_MAX_XLSX_UNCOMPRESSED", importConfig().maxXlsxUncompressed);
}

export function xlsxRatioLimit(): number {
  return readEnvInt("IMPORT_MAX_XLSX_RATIO", importConfig().maxXlsxRatio);
}

export function xlsxEntryLimit(): number {
  return readEnvInt("IMPORT_MAX_XLSX_ENTRIES", importConfig().maxXlsxEntries);
}

export function xlsxSharedStringsLimit(): number {
  return readEnvInt("IMPORT_MAX_SHARED_STRINGS_BYTES", importConfig().maxSharedStringsBytes);
}

export function xlsxEntryByteLimit(): number {
  return readEnvInt("IMPORT_MAX_XLSX_ENTRY_BYTES", importConfig().maxXlsxEntryBytes);
}

export function xlsxColumnLimit(): number {
  return readEnvInt("IMPORT_MAX_COLUMNS", importConfig().maxColumns);
}

export function xlsxTooLargeMessage(kind: "file" | "rows"): string {
  if (kind === "file") {
    const mb = Math.round(xlsxFileByteLimit() / (1024 * 1024));
    return `XLSX file exceeds the ${mb} MB limit. Please upload a CSV instead.`;
  }
  return `XLSX exceeds the ${xlsxRowLimit()} row limit. Please upload a CSV instead.`;
}

/**
 * Phase 1 stand-in for the S3 error report. The architecture stores failed
 * rows in S3; the repository keeps a capped preview on the job so
 * recordRowErrors is testable without object storage.
 */
export const IMPORT_ROW_ERROR_PREVIEW_MAX = 100;

export const IMPORT_ALLOWED_MIME_TYPES = [
  "text/csv",
  "application/csv",
  "text/plain",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

export const DEFAULT_IMPORT_IDENTITY_KEYS = [
  IDENTITY_FIELD.PHONE,
  IDENTITY_FIELD.EMAIL,
] as const;

export const DEFAULT_MERGE_EMPTY_ONLY = [
  "name",
  "email",
  "phone",
  "tags",
] as const;
