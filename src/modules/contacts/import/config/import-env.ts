import { config } from "../../../../config/index.js";
import {
  IMPORT_ABANDONED_UPLOAD_MS,
  IMPORT_BACKOFF_BASE_MS,
  IMPORT_CHUNK_ATTEMPTS,
  IMPORT_CHUNK_MAX_BYTES,
  IMPORT_CHUNK_RETENTION_MS,
  IMPORT_CHUNK_ROWS,
  IMPORT_DISPATCH_K_DEFAULT,
  IMPORT_ERROR_REPORT_TTL_MS,
  IMPORT_HEARTBEAT_MS_DEFAULT,
  IMPORT_LEASE_TTL_MULTIPLIER,
  IMPORT_ORG_ACTIVE_SLOTS_DEFAULT,
  IMPORT_SOURCE_TTL_MS,
  IMPORT_STALL_MAX_MS_DEFAULT,
} from "../constants/import.constant.js";

export interface ImportRuntimeSettings {
  orgActiveSlots: number;
  dispatchK: number;
  heartbeatMs: number;
  leaseMs: number;
  stallMaxMs: number;
  rowsPerChunk: number;
  maxChunkBytes: number;
  xlsxTempDir?: string;
  xlsxTempMaxBytes?: number;
  sourceTtlMs: number;
  errorReportTtlMs: number;
  chunkRetentionMs: number;
  abandonedUploadMs: number;
  chunkAttempts: number;
  backoffBaseMs: number;
}

export function settingsFromConfig(
  overrides: Partial<ImportRuntimeSettings> = {},
): ImportRuntimeSettings {
  const importConfig = config.import;
  return {
    orgActiveSlots: importConfig.orgActiveSlots,
    dispatchK: importConfig.dispatchK,
    heartbeatMs: importConfig.heartbeatMs,
    leaseMs: importConfig.leaseMs,
    stallMaxMs: importConfig.stallMaxMs,
    rowsPerChunk: importConfig.rowsPerChunk,
    maxChunkBytes: importConfig.maxChunkBytes,
    xlsxTempDir: importConfig.xlsxTempDir,
    xlsxTempMaxBytes: importConfig.xlsxTempMaxBytes,
    sourceTtlMs: importConfig.sourceTtlMs,
    errorReportTtlMs: importConfig.errorReportTtlMs,
    chunkRetentionMs: importConfig.chunkRetentionMs,
    abandonedUploadMs: importConfig.abandonedUploadMs,
    chunkAttempts: importConfig.chunkAttempts,
    backoffBaseMs: importConfig.backoffBaseMs,
    ...overrides,
  };
}

export function settingsFromEnv(
  overrides: Partial<ImportRuntimeSettings> = {},
): ImportRuntimeSettings {
  return settingsFromConfig(overrides);
}

export function defaultRuntimeSettings(
  overrides: Partial<ImportRuntimeSettings> = {},
): ImportRuntimeSettings {
  return {
    orgActiveSlots: IMPORT_ORG_ACTIVE_SLOTS_DEFAULT,
    dispatchK: IMPORT_DISPATCH_K_DEFAULT,
    heartbeatMs: IMPORT_HEARTBEAT_MS_DEFAULT,
    leaseMs: IMPORT_HEARTBEAT_MS_DEFAULT * IMPORT_LEASE_TTL_MULTIPLIER,
    stallMaxMs: IMPORT_STALL_MAX_MS_DEFAULT,
    rowsPerChunk: IMPORT_CHUNK_ROWS,
    maxChunkBytes: IMPORT_CHUNK_MAX_BYTES,
    sourceTtlMs: IMPORT_SOURCE_TTL_MS,
    errorReportTtlMs: IMPORT_ERROR_REPORT_TTL_MS,
    chunkRetentionMs: IMPORT_CHUNK_RETENTION_MS,
    abandonedUploadMs: IMPORT_ABANDONED_UPLOAD_MS,
    chunkAttempts: IMPORT_CHUNK_ATTEMPTS,
    backoffBaseMs: IMPORT_BACKOFF_BASE_MS,
    ...overrides,
  };
}
