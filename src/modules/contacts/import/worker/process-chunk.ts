import { MongoBulkWriteError } from "mongodb";
import { ContactModel } from "../../../../models/contact.model.js";
import {
  IMPORT_CHUNK_LEASE_MS,
  IMPORT_ERROR_CODE,
} from "../constants/import.constant.js";
import { PermanentError, TransientError } from "../errors/import-worker.errors.js";
import { readChunkRows } from "../parser/chunker.js";
import { canonicalCsvKey } from "../parser/inspect-file.js";
import { buildBulkOps, buildInsertDocuments } from "../pipeline/build-bulk-ops.js";
import { dedupeChunk, type ChunkRow } from "../pipeline/dedupe-chunk.js";
import { writeErrorPart } from "../pipeline/error-part.js";
import { mapRow } from "../pipeline/map-row.js";
import { validateRow } from "../pipeline/validate-row.js";
import type { ContactImportRepository } from "../repositories/contact-import.repository.js";
import type { FileStore } from "../store/file-store.js";
import type {
  ChunkResultCounters,
  ContactImportJobRecord,
  ImportChunkDescriptor,
  ImportRowError,
  ImportWorkspaceId,
} from "../types/import.types.js";

export type ProcessPhase = "claimed" | "read" | "validated" | "written" | "completed";

export interface ProcessChunkContext {
  workspaceId: ImportWorkspaceId;
  jobId: string;
  repository: ContactImportRepository;
  store: FileStore;
  leaseMs?: number;
  leaseToken?: string;
  heartbeatMs?: number;
  onPhase?: (phase: ProcessPhase) => void | Promise<void>;
}

export interface ProcessChunkResult {
  applied: boolean;
  alreadyDone: boolean;
  fenced: boolean;
  counters: ChunkResultCounters;
  errorPartKey?: string;
}

export async function processChunk(
  ctx: ProcessChunkContext,
  descriptor: ImportChunkDescriptor,
): Promise<ProcessChunkResult> {
  const job = await ctx.repository.getJob(ctx.workspaceId, ctx.jobId);
  if (!job) {
    throw new PermanentError("Import job not found", IMPORT_ERROR_CODE.IMPORT_NOT_FOUND);
  }

  const detected = job.file.detected;
  if (!detected) {
    throw new PermanentError(
      "Import file was not inspected",
      IMPORT_ERROR_CODE.IMPORT_INVALID_STATE,
    );
  }
  const headers = job.headers;
  if (headers.length === 0) {
    throw new PermanentError(
      "Import headers are missing",
      IMPORT_ERROR_CODE.IMPORT_INVALID_STATE,
    );
  }
  const sourceKey = detected.kind === "xlsx" ? canonicalCsvKey(job.file.key) : job.file.key;

  let leaseToken = ctx.leaseToken;
  if (leaseToken === undefined) {
    const claim = await ctx.repository.claimChunk(
      ctx.workspaceId,
      ctx.jobId,
      descriptor,
      { leaseMs: ctx.leaseMs ?? IMPORT_CHUNK_LEASE_MS },
    );
    if (!claim.ok) {
      if (claim.reason === "leased") {
        throw new TransientError("Chunk is leased by another worker", "IMPORT_LEASED");
      }
      throw new PermanentError("Import job not found", IMPORT_ERROR_CODE.IMPORT_NOT_FOUND);
    }
    if (claim.alreadyDone) {
      return {
        applied: false,
        alreadyDone: true,
        fenced: false,
        counters: {
          inserted: claim.chunk.inserted,
          updated: claim.chunk.updated,
          skipped: claim.chunk.skipped,
          failed: claim.chunk.failed,
          duplicates: claim.chunk.duplicates,
        },
      };
    }
    leaseToken = claim.leaseToken;
  }

  const heartbeatMs = ctx.heartbeatMs ?? 0;
  const timer =
    heartbeatMs > 0
      ? setInterval(() => {
          void ctx.repository.heartbeat(
            ctx.workspaceId,
            ctx.jobId,
            descriptor.index,
            leaseToken,
            { leaseMs: ctx.leaseMs ?? IMPORT_CHUNK_LEASE_MS },
          );
        }, heartbeatMs)
      : undefined;

  try {
    return await runChunk(
      ctx,
      job,
      descriptor,
      headers,
      sourceKey,
      detected.delimiter,
      leaseToken,
    );
  } finally {
    if (timer !== undefined) {
      clearInterval(timer);
    }
  }
}

async function runChunk(
  ctx: ProcessChunkContext,
  job: ContactImportJobRecord,
  descriptor: ImportChunkDescriptor,
  headers: string[],
  sourceKey: string,
  delimiter: "," | ";" | "\t" | "|",
  leaseToken: string,
): Promise<ProcessChunkResult> {
  await pulse(ctx, leaseToken, descriptor.index, "claimed");

  const parsed = await readChunkRows(ctx.store, sourceKey, descriptor, delimiter);
  await pulse(ctx, leaseToken, descriptor.index, "read");

  const errors: ImportRowError[] = [];
  const valid: ChunkRow[] = [];
  for (const row of parsed) {
    if (row.error) {
      errors.push({
        rowNumber: row.rowNumber,
        reason: row.error.code,
        raw: row.fields,
      });
      continue;
    }
    const mapped = mapRow(row.fields, headers, job.mapping);
    const outcome = validateRow(
      mapped,
      row.fields,
      row.rowNumber,
      job.identity,
      job.defaultCountry,
    );
    if (!outcome.ok) {
      errors.push(outcome.error);
      continue;
    }
    valid.push({ rowNumber: row.rowNumber, raw: row.fields, contact: outcome.contact });
  }

  const deduped = dedupeChunk(valid, job.policy);
  await pulse(ctx, leaseToken, descriptor.index, "validated");

  const counters: ChunkResultCounters = {
    inserted: 0,
    updated: 0,
    skipped: deduped.skipped,
    failed: errors.length,
    duplicates: 0,
  };

  if (deduped.winners.length > 0) {
    const writeOptions = { consentMarketing: job.consentAttestation?.confirmed === true };
    const built = buildBulkOps(
      deduped.winners,
      job.accountId,
      job.policy,
      job.merge,
      writeOptions,
    );
    const write =
      job.policy === "skip"
        ? await executeInsertMany(buildInsertDocuments(deduped.winners, job.accountId, writeOptions))
        : await executeBulk(built.ops);
    const bindings = built.bindings;
    counters.inserted += write.inserted;
    counters.updated += write.updated;
    counters.skipped += write.skipped;
    counters.duplicates += write.duplicateIndexes.length;
    counters.failed += write.failedIndexes.length;
    for (const index of write.failedIndexes) {
      const binding = bindings[index];
      if (!binding) {
        continue;
      }
      errors.push({
        rowNumber: binding.rowNumber,
        reason: "WRITE_FAILED",
        raw: binding.raw,
      });
    }
  }

  await pulse(ctx, leaseToken, descriptor.index, "written");

  const errorPart = await writeErrorPart(ctx.store, ctx.jobId, descriptor.index, errors);
  if (errors.length > 0) {
    await ctx.repository.recordRowErrors(ctx.workspaceId, ctx.jobId, errors);
  }

  const completed = await ctx.repository.completeChunk(ctx.workspaceId, ctx.jobId, {
    ...descriptor,
    ...counters,
    leaseToken,
  });

  await ctx.onPhase?.("completed");

  if (!completed.applied) {
    return {
      applied: false,
      alreadyDone: completed.reason === "already_done",
      fenced: completed.reason === "lease_mismatch",
      counters,
      errorPartKey: errorPart,
    };
  }

  return {
    applied: true,
    alreadyDone: false,
    fenced: false,
    counters,
    errorPartKey: errorPart,
  };
}

async function pulse(
  ctx: ProcessChunkContext,
  leaseToken: string,
  index: number,
  phase: ProcessPhase,
): Promise<void> {
  const ok = await ctx.repository.heartbeat(
    ctx.workspaceId,
    ctx.jobId,
    index,
    leaseToken,
    { leaseMs: ctx.leaseMs ?? IMPORT_CHUNK_LEASE_MS },
  );
  if (!ok) {
    throw new TransientError("Import chunk lease lost", "IMPORT_LEASE_LOST");
  }
  await ctx.onPhase?.(phase);
}

interface BulkCounts {
  inserted: number;
  updated: number;
  skipped: number;
  duplicateIndexes: number[];
  failedIndexes: number[];
}

async function executeInsertMany(docs: Array<Record<string, unknown>>): Promise<BulkCounts> {
  try {
    const result = await ContactModel.collection.insertMany(docs, { ordered: false });
    return fromResult(result.insertedCount, 0, 0, [], []);
  } catch (error) {
    if (!isBulkWriteError(error) && !hasWriteErrors(error)) {
      throw new TransientError(
        error instanceof Error ? error.message : "Contact insertMany failed",
        "IMPORT_BULK_TRANSIENT",
      );
    }
    const duplicateIndexes: number[] = [];
    const failedIndexes: number[] = [];
    const writeErrors = readWriteErrors(error);
    for (const writeError of writeErrors) {
      if (writeError.code === 11000) {
        duplicateIndexes.push(writeError.index);
      } else {
        failedIndexes.push(writeError.index);
      }
    }
    const inserted = insertedCountFromWriteError(error, docs.length - duplicateIndexes.length - failedIndexes.length);
    return fromResult(inserted, 0, 0, duplicateIndexes, failedIndexes);
  }
}

function hasWriteErrors(error: unknown): boolean {
  return typeof error === "object" && error !== null && "writeErrors" in error;
}

function readWriteErrors(error: unknown): Array<{ code: number; index: number }> {
  if (typeof error !== "object" || error === null || !("writeErrors" in error)) {
    return [];
  }
  const writeErrors = error.writeErrors;
  const list = Array.isArray(writeErrors) ? writeErrors : writeErrors ? [writeErrors] : [];
  return list.flatMap((item) => {
    if (typeof item !== "object" || item === null) {
      return [];
    }
    if (!("code" in item) || !("index" in item)) {
      return [];
    }
    if (typeof item.code !== "number" || typeof item.index !== "number") {
      return [];
    }
    return [{ code: item.code, index: item.index }];
  });
}

function insertedCountFromWriteError(error: unknown, fallback: number): number {
  if (typeof error === "object" && error !== null && "insertedDocs" in error && Array.isArray(error.insertedDocs)) {
    return error.insertedDocs.length;
  }
  return Math.max(0, fallback);
}

async function executeBulk(
  ops: Parameters<typeof ContactModel.bulkWrite>[0],
): Promise<BulkCounts> {
  try {
    const result = await ContactModel.bulkWrite(ops, { ordered: false });
    return fromResult(result.upsertedCount, result.modifiedCount, result.matchedCount, [], []);
  } catch (error) {
    if (!isBulkWriteError(error)) {
      throw new TransientError(
        error instanceof Error ? error.message : "Contact bulkWrite failed",
        "IMPORT_BULK_TRANSIENT",
      );
    }
    const duplicateIndexes: number[] = [];
    const failedIndexes: number[] = [];
    const writeErrors = Array.isArray(error.writeErrors)
      ? error.writeErrors
      : error.writeErrors
        ? [error.writeErrors]
        : [];
    for (const writeError of writeErrors) {
      if (writeError.code === 11000) {
        duplicateIndexes.push(writeError.index);
      } else {
        failedIndexes.push(writeError.index);
      }
    }
    const result = error.result;
    return fromResult(
      result.upsertedCount,
      result.modifiedCount,
      result.matchedCount,
      duplicateIndexes,
      failedIndexes,
    );
  }
}

function fromResult(
  upsertedCount: number,
  modifiedCount: number,
  matchedCount: number,
  duplicateIndexes: number[],
  failedIndexes: number[],
): BulkCounts {
  return {
    inserted: upsertedCount,
    updated: modifiedCount,
    skipped: Math.max(0, matchedCount - modifiedCount),
    duplicateIndexes,
    failedIndexes,
  };
}

function isBulkWriteError(error: unknown): error is MongoBulkWriteError {
  return error instanceof MongoBulkWriteError;
}
