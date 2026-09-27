import { z } from "zod";
import {
  DEFAULT_IMPORT_IDENTITY_KEYS,
  DEFAULT_MERGE_EMPTY_ONLY,
  DUPLICATE_POLICY,
  IDENTITY_FIELD,
  IMPORT_ALLOWED_MIME_TYPES,
  IMPORT_CHUNK_STATUS,
  IMPORT_FIELD_TARGET,
  IMPORT_FIELD_TRANSFORM,
  IMPORT_MAX_FILE_BYTES,
  IMPORT_STATUS,
} from "../constants/import.constant.js";

export const ImportWorkspaceIdSchema = z.object({
  organizationId: z.string().min(1),
  accountId: z.string().min(1),
});

export const ImportStatusSchema = z.enum([
  IMPORT_STATUS.UPLOADED,
  IMPORT_STATUS.SCANNING,
  IMPORT_STATUS.VALIDATING,
  IMPORT_STATUS.MAPPING,
  IMPORT_STATUS.QUEUED,
  IMPORT_STATUS.PROCESSING,
  IMPORT_STATUS.PAUSED,
  IMPORT_STATUS.COMPLETED,
  IMPORT_STATUS.COMPLETED_WITH_ERRORS,
  IMPORT_STATUS.FAILED,
  IMPORT_STATUS.CANCELLED,
]);

export const DuplicatePolicySchema = z.enum([
  DUPLICATE_POLICY.SKIP,
  DUPLICATE_POLICY.UPDATE,
  DUPLICATE_POLICY.MERGE,
]);

export const IdentityFieldSchema = z.enum([
  IDENTITY_FIELD.PHONE,
  IDENTITY_FIELD.EMAIL,
]);

export const ImportFieldTargetSchema = z.enum([
  IMPORT_FIELD_TARGET.NAME,
  IMPORT_FIELD_TARGET.EMAIL,
  IMPORT_FIELD_TARGET.PHONE,
  IMPORT_FIELD_TARGET.STATUS,
  IMPORT_FIELD_TARGET.TAGS,
  IMPORT_FIELD_TARGET.WHATSAPP_OPT_IN,
  IMPORT_FIELD_TARGET.IGNORE,
]);

export const ImportFieldTransformSchema = z.enum([
  IMPORT_FIELD_TRANSFORM.NONE,
  IMPORT_FIELD_TRANSFORM.TRIM,
  IMPORT_FIELD_TRANSFORM.LOWERCASE,
]);

export const ImportFieldMappingSchema = z.object({
  source: z.string().min(1),
  target: ImportFieldTargetSchema,
  transform: ImportFieldTransformSchema.default(IMPORT_FIELD_TRANSFORM.NONE),
});

export const ImportIdentityConfigSchema = z.object({
  keys: z
    .array(IdentityFieldSchema)
    .min(1)
    .default([...DEFAULT_IMPORT_IDENTITY_KEYS]),
});

export const MergeRulesSchema = z.object({
  emptyOnly: z
    .array(z.enum(["name", "email", "phone", "tags"]))
    .default([...DEFAULT_MERGE_EMPTY_ONLY]),
  tags: z.enum(["union", "replace"]).default("union"),
  allowStatusUpgrade: z.boolean().default(false),
});

export const ImportChunkStatusSchema = z.enum([
  IMPORT_CHUNK_STATUS.PENDING,
  IMPORT_CHUNK_STATUS.PROCESSING,
  IMPORT_CHUNK_STATUS.DONE,
  IMPORT_CHUNK_STATUS.FAILED,
]);

export const ImportChunkDescriptorSchema = z.object({
  index: z.number().int().min(0),
  startRow: z.number().int().min(1),
  endRow: z.number().int().min(1),
  byteOffsetStart: z.number().int().min(0),
  byteOffsetEnd: z.number().int().min(0),
});

export const ImportRowErrorSchema = z.object({
  rowNumber: z.number().int().min(1),
  reason: z.string().min(1),
  column: z.string().optional(),
  rawValue: z.string().optional(),
  raw: z.array(z.string()),
});

export const ImportProgressCountersSchema = z.object({
  totalRows: z.number().int().min(0),
  processed: z.number().int().min(0),
  inserted: z.number().int().min(0),
  updated: z.number().int().min(0),
  skipped: z.number().int().min(0),
  failed: z.number().int().min(0),
  duplicates: z.number().int().min(0),
});

export const ImportProgressSnapshotSchema = z.object({
  totalRows: z.number().int().min(0).nullable(),
  processed: z.number().int().min(0),
  inserted: z.number().int().min(0),
  updated: z.number().int().min(0),
  skipped: z.number().int().min(0),
  failed: z.number().int().min(0),
  duplicates: z.number().int().min(0),
  rowsPerSec: z.number().min(0),
  etaSec: z.number().int().min(0).nullable(),
});

export const CreateImportRequestSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.enum(IMPORT_ALLOWED_MIME_TYPES),
  fileSize: z
    .number()
    .int()
    .positive()
    .max(IMPORT_MAX_FILE_BYTES, "File exceeds 250 MB"),
  checksumSha256: z
    .string()
    .regex(/^[a-fA-F0-9]{64}$/)
    .optional(),
});

export const ConsentAttestationInputSchema = z.object({
  confirmed: z.literal(true),
  textVersion: z.string().min(1).optional(),
});

export const IsoCountryCodeSchema = z
  .string()
  .regex(/^[A-Za-z]{2}$/, "defaultCountry must be a 2-letter ISO country code")
  .transform((value) => value.toUpperCase());

export const StartImportRequestSchema = z
  .object({
    mapping: z.array(ImportFieldMappingSchema).min(1),
    policy: DuplicatePolicySchema.default(DUPLICATE_POLICY.UPDATE),
    identity: ImportIdentityConfigSchema.optional(),
    merge: MergeRulesSchema.optional(),
    defaultCountry: IsoCountryCodeSchema,
    consentAttestation: ConsentAttestationInputSchema.optional(),
  })
  .strict();

export const DryRunRequestSchema = z
  .object({
    mapping: z.array(ImportFieldMappingSchema).min(1),
    policy: DuplicatePolicySchema.default(DUPLICATE_POLICY.UPDATE),
    identity: ImportIdentityConfigSchema.optional(),
    defaultCountry: IsoCountryCodeSchema,
    sampleSize: z.number().int().min(1).max(200).default(200),
  })
  .strict();

export const CreateImportResultDocSchema = z.object({
  id: z.string(),
  status: z.literal(IMPORT_STATUS.UPLOADED),
  uploadUrl: z.string(),
  key: z.string(),
  expiresInSec: z.number().int().positive(),
  maxBytes: z.literal(IMPORT_MAX_FILE_BYTES),
});

export const ImportJobDocSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  organizationId: z.string(),
  status: ImportStatusSchema,
  fileName: z.string(),
  mimeType: z.string(),
  fileSize: z.number(),
  policy: DuplicatePolicySchema,
  identity: ImportIdentityConfigSchema,
  mapping: z.array(ImportFieldMappingSchema).optional(),
  sampleRows: z.array(z.array(z.string())),
  headers: z.array(z.string()),
  progress: ImportProgressSnapshotSchema,
  errorMessage: z.string().optional(),
  errorReportKey: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ImportWorkspaceId = z.infer<typeof ImportWorkspaceIdSchema>;
export type ImportStatus = z.infer<typeof ImportStatusSchema>;
export type DuplicatePolicy = z.infer<typeof DuplicatePolicySchema>;
export type IdentityField = z.infer<typeof IdentityFieldSchema>;
export type ImportFieldMapping = z.infer<typeof ImportFieldMappingSchema>;
export type ImportIdentityConfig = z.infer<typeof ImportIdentityConfigSchema>;
export type MergeRules = z.infer<typeof MergeRulesSchema>;
export type ImportChunkStatus = z.infer<typeof ImportChunkStatusSchema>;
export type ImportChunkDescriptor = z.infer<typeof ImportChunkDescriptorSchema>;
export type ImportRowError = z.infer<typeof ImportRowErrorSchema>;
export type ImportProgressCounters = z.infer<typeof ImportProgressCountersSchema>;
export type ImportProgressSnapshot = z.infer<typeof ImportProgressSnapshotSchema>;
export type CreateImportRequest = z.infer<typeof CreateImportRequestSchema>;
export type StartImportRequest = z.infer<typeof StartImportRequestSchema>;
export type DryRunRequest = z.infer<typeof DryRunRequestSchema>;
export type ConsentAttestationInput = z.infer<typeof ConsentAttestationInputSchema>;

export interface ImportConsentAttestation {
  confirmed: true;
  userId: string;
  at: Date;
  ip?: string;
  userAgent?: string;
  textVersion?: string;
}

export type ImportQuotaStatus = "none" | "checked" | "settled" | "released";

export interface ImportQuotaSettlement {
  status: ImportQuotaStatus;
  reservedRows?: number;
  settledInserted?: number;
}
export type CreateImportResultDoc = z.infer<typeof CreateImportResultDocSchema>;
export type ImportJobDoc = z.infer<typeof ImportJobDocSchema>;

export type TransitionFailureReason =
  | "illegal_transition"
  | "conflict"
  | "not_found";

export type TransitionResult<T> =
  | { ok: true; job: T }
  | { ok: false; reason: TransitionFailureReason };

export interface CreateImportJobInput {
  id?: string;
  workspaceId: ImportWorkspaceId;
  createdBy: string;
  clientRequestId?: string;
  file: {
    bucket: string;
    key: string;
    fileName: string;
    mimeType: string;
    byteSize: number;
    sha256?: string;
  };
  policy?: DuplicatePolicy;
  identity?: ImportIdentityConfig;
  merge?: MergeRules;
}

export interface ImportJobPatch {
  mapping?: ImportFieldMapping[];
  policy?: DuplicatePolicy;
  identity?: ImportIdentityConfig;
  merge?: MergeRules;
  sampleRows?: string[][];
  headers?: string[];
  cancelRequested?: boolean;
  pauseRequested?: boolean;
  errorMessage?: string;
  errorReportKey?: string;
  startedAt?: Date;
  completedAt?: Date;
  defaultCountry?: string;
  defaultAssigneeId?: string;
  consentAttestation?: ImportConsentAttestation;
  quota?: ImportQuotaSettlement;
  dryRun?: { windowStartedAt: Date; count: number };
  file?: ContactImportJobRecord["file"];
  totalRows?: number;
  totalChunks?: number;
}

export interface ContactImportJobRecord {
  id: string;
  organizationId: string;
  accountId: string;
  createdBy: string;
  clientRequestId?: string;
  status: ImportStatus;
  file: CreateImportJobInput["file"] & {
    detected?: {
      kind: "csv" | "xlsx";
      encoding: "utf-8" | "utf-16le" | "windows-1252";
      delimiter: "," | ";" | "\t" | "|";
      hasBom: boolean;
      sheetNames?: string[];
      sheetName?: string;
      date1904?: boolean;
    };
  };
  policy: DuplicatePolicy;
  identity: ImportIdentityConfig;
  mapping: ImportFieldMapping[];
  merge: MergeRules;
  defaultCountry: string;
  defaultAssigneeId?: string;
  consentAttestation?: ImportConsentAttestation;
  quota?: ImportQuotaSettlement;
  dryRun?: { windowStartedAt: Date; count: number };
  sampleRows: string[][];
  headers: string[];
  cursor: {
    byteOffset: number;
    rowNumber: number;
    sheetIndex: number;
    chunkIndex: number;
  };
  counters: ImportProgressCounters;
  rowErrorPreview: ImportRowError[];
  cancelRequested: boolean;
  pauseRequested: boolean;
  errorMessage?: string;
  errorReportKey?: string;
  totalRows: number;
  totalChunks: number;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactImportChunkRecord {
  id: string;
  jobId: string;
  organizationId: string;
  accountId: string;
  index: number;
  startRow: number;
  endRow: number;
  byteOffsetStart: number;
  byteOffsetEnd: number;
  status: ImportChunkStatus;
  attempts: number;
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  duplicates: number;
  totalsApplied: boolean;
  leaseToken?: string;
  leaseExpiresAt?: Date;
  error?: string;
  lastError?: string;
  lockedAt?: Date;
  completedAt?: Date;
}

export interface CompleteChunkInput {
  index: number;
  startRow: number;
  endRow: number;
  byteOffsetStart: number;
  byteOffsetEnd: number;
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  duplicates: number;
  leaseToken: string;
  error?: string;
}

export interface CompleteChunkOptions {
  applyJobTotals?: boolean;
}

export type ClaimChunkResult =
  | {
      ok: true;
      alreadyDone: true;
      chunk: ContactImportChunkRecord;
    }
  | {
      ok: true;
      alreadyDone: false;
      chunk: ContactImportChunkRecord;
      leaseToken: string;
      leaseExpiresAt: Date;
    }
  | { ok: false; reason: "not_found" | "leased" };

export type CompleteChunkFailureReason =
  | "not_found"
  | "already_done"
  | "lease_mismatch";

export type CompleteChunkResult =
  | {
      applied: true;
      chunk: ContactImportChunkRecord;
      job: ContactImportJobRecord;
    }
  | {
      applied: false;
      reason: CompleteChunkFailureReason;
      chunk?: ContactImportChunkRecord;
    };

export interface ChunkResultCounters {
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  duplicates: number;
}
