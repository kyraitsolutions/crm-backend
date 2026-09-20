import { Schema, Types, model } from "mongoose";
import { IMPORT_CHUNK_STATUS } from "../constants/import.constant.js";
import type { ImportChunkStatus } from "../types/import.types.js";

export interface ContactImportChunkAttrs {
  jobId: Types.ObjectId;
  organizationId: Types.ObjectId;
  accountId: Types.ObjectId;
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

const schema = new Schema<ContactImportChunkAttrs>(
  {
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "ContactImportJob",
      required: true,
    },
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
    index: { type: Number, required: true },
    startRow: { type: Number, required: true },
    endRow: { type: Number, required: true },
    byteOffsetStart: { type: Number, required: true },
    byteOffsetEnd: { type: Number, default: 0 },
    status: {
      type: String,
      enum: Object.values(IMPORT_CHUNK_STATUS),
      default: IMPORT_CHUNK_STATUS.PENDING,
    },
    attempts: { type: Number, default: 0 },
    inserted: { type: Number, default: 0 },
    updated: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    duplicates: { type: Number, default: 0 },
    totalsApplied: { type: Boolean, default: false },
    leaseToken: { type: String },
    leaseExpiresAt: { type: Date },
    error: { type: String },
    lastError: { type: String },
    lockedAt: { type: Date },
    completedAt: { type: Date },
  },
  {
    timestamps: false,
    versionKey: false,
    collection: "contact_import_chunks",
  },
);

// Resume / replay: one document per (job, chunk index). Invariant 2.
schema.index({ jobId: 1, index: 1 }, { name: "uniq_import_chunk", unique: true });
// Worker lookup of unfinished chunks for a job.
schema.index({ jobId: 1, status: 1 }, { name: "idx_import_chunk_status" });

export const ContactImportChunkModel = model<ContactImportChunkAttrs>(
  "ContactImportChunk",
  schema,
);
