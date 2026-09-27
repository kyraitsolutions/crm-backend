import { Schema, Types, model } from "mongoose";
import {
  DEFAULT_IMPORT_IDENTITY_KEYS,
  DEFAULT_MERGE_EMPTY_ONLY,
  DUPLICATE_POLICY,
  IMPORT_DEFAULT_REGION,
  IMPORT_FIELD_TRANSFORM,
  IMPORT_JOB_TTL_SECONDS,
  IMPORT_STATUS,
} from "../constants/import.constant.js";
import type {
  DuplicatePolicy,
  ImportFieldMapping,
  ImportIdentityConfig,
  ImportProgressCounters,
  ImportRowError,
  ImportStatus,
  MergeRules,
} from "../types/import.types.js";

export interface ContactImportJobAttrs {
  organizationId: Types.ObjectId;
  accountId: Types.ObjectId;
  createdBy: Types.ObjectId;
  clientRequestId?: string;
  status: ImportStatus;
  file: {
    bucket: string;
    key: string;
    fileName: string;
    mimeType: string;
    byteSize: number;
    sha256?: string;
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
  defaultAssigneeId?: Types.ObjectId;
  consentAttestation?: {
    confirmed: true;
    userId: Types.ObjectId;
    at: Date;
    ip?: string;
    userAgent?: string;
    textVersion?: string;
  };
  quota?: {
    status: "none" | "checked" | "settled" | "released";
    reservedRows?: number;
    settledInserted?: number;
  };
  dryRun?: {
    windowStartedAt: Date;
    count: number;
  };
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

const detectedSchema = new Schema(
  {
    kind: { type: String, enum: ["csv", "xlsx"] },
    encoding: { type: String, enum: ["utf-8", "utf-16le", "windows-1252"] },
    delimiter: { type: String, enum: [",", ";", "\t", "|"] },
    hasBom: { type: Boolean },
    sheetNames: { type: [String], required: false },
    sheetName: { type: String, required: false },
    date1904: { type: Boolean, required: false },
  },
  { _id: false },
);

const mappingSchema = new Schema(
  {
    source: { type: String, required: true },
    target: { type: String, required: true },
    transform: {
      type: String,
      enum: Object.values(IMPORT_FIELD_TRANSFORM),
      default: IMPORT_FIELD_TRANSFORM.NONE,
    },
  },
  { _id: false },
);

const rowErrorSchema = new Schema(
  {
    rowNumber: { type: Number, required: true },
    reason: { type: String, required: true },
    column: { type: String },
    rawValue: { type: String },
    raw: { type: [String], default: [] },
  },
  { _id: false },
);

const schema = new Schema<ContactImportJobAttrs>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    clientRequestId: { type: String },
    status: {
      type: String,
      enum: Object.values(IMPORT_STATUS),
      default: IMPORT_STATUS.UPLOADED,
      required: true,
    },
    file: {
      bucket: { type: String, required: true },
      key: { type: String, required: true },
      fileName: { type: String, required: true },
      mimeType: { type: String, required: true },
      byteSize: { type: Number, required: true },
      sha256: { type: String },
      detected: { type: detectedSchema, required: false },
    },
    policy: {
      type: String,
      enum: Object.values(DUPLICATE_POLICY),
      default: DUPLICATE_POLICY.UPDATE,
    },
    identity: {
      keys: {
        type: [String],
        default: () => [...DEFAULT_IMPORT_IDENTITY_KEYS],
      },
    },
    mapping: { type: [mappingSchema], default: [] },
    merge: {
      emptyOnly: {
        type: [String],
        default: () => [...DEFAULT_MERGE_EMPTY_ONLY],
      },
      tags: { type: String, enum: ["union", "replace"], default: "union" },
      allowStatusUpgrade: { type: Boolean, default: false },
    },
    defaultCountry: { type: String, default: IMPORT_DEFAULT_REGION },
    defaultAssigneeId: { type: Schema.Types.ObjectId, ref: "User", required: false },
    consentAttestation: {
      type: new Schema(
        {
          confirmed: { type: Boolean, required: true },
          userId: { type: Schema.Types.ObjectId, required: true },
          at: { type: Date, required: true },
          ip: { type: String },
          userAgent: { type: String },
          textVersion: { type: String },
        },
        { _id: false },
      ),
      required: false,
    },
    quota: {
      type: new Schema(
        {
          status: {
            type: String,
            enum: ["none", "checked", "settled", "released"],
            default: "none",
          },
          reservedRows: { type: Number },
          settledInserted: { type: Number },
        },
        { _id: false },
      ),
      required: false,
    },
    dryRun: {
      type: new Schema(
        {
          windowStartedAt: { type: Date },
          count: { type: Number, default: 0 },
        },
        { _id: false },
      ),
      required: false,
    },
    sampleRows: { type: [[String]], default: [] },
    headers: { type: [String], default: [] },
    cursor: {
      byteOffset: { type: Number, default: 0 },
      rowNumber: { type: Number, default: 0 },
      sheetIndex: { type: Number, default: 0 },
      // -1 so the first committed chunk is index 0 (worker: chunkIndex + 1).
      chunkIndex: { type: Number, default: -1 },
    },
    counters: {
      totalRows: { type: Number, default: 0 },
      processed: { type: Number, default: 0 },
      inserted: { type: Number, default: 0 },
      updated: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      duplicates: { type: Number, default: 0 },
    },
    rowErrorPreview: { type: [rowErrorSchema], default: [] },
    cancelRequested: { type: Boolean, default: false },
    pauseRequested: { type: Boolean, default: false },
    errorMessage: { type: String },
    errorReportKey: { type: String },
    totalRows: { type: Number, default: 0 },
    totalChunks: { type: Number, default: 0 },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "contact_import_jobs",
  },
);

// Idempotent create: same clientRequestId in a workspace returns the same job.
// Partial unique (not sparse): MongoDB forbids mixing sparse + partialFilterExpression.
schema.index(
  { organizationId: 1, accountId: 1, clientRequestId: 1 },
  {
    name: "uniq_import_client_request",
    unique: true,
    partialFilterExpression: { clientRequestId: { $type: "string", $gt: "" } },
  },
);
// Tenant job list: GET /imports sorted by createdAt.
schema.index({ accountId: 1, createdAt: -1 }, { name: "idx_import_account_created" });
// Org fairness / active-job sweep by status.
schema.index({ organizationId: 1, status: 1 }, { name: "idx_import_org_status" });
// Worker sweep of non-terminal jobs by recency.
schema.index({ status: 1, updatedAt: 1 }, { name: "idx_import_status_updated" });
// 90-day TTL for import artifacts (architecture cleanup table).
schema.index(
  { createdAt: 1 },
  { name: "ttl_import_jobs", expireAfterSeconds: IMPORT_JOB_TTL_SECONDS },
);

export const ContactImportJobModel = model<ContactImportJobAttrs>(
  "ContactImportJob",
  schema,
);
