import { randomUUID } from "node:crypto";
import { MongoServerError } from "mongodb";
import { Types } from "mongoose";
import { HttpError } from "../../../../utils/http.error.js";
import {
  DEFAULT_IMPORT_IDENTITY_KEYS,
  DEFAULT_MERGE_EMPTY_ONLY,
  DUPLICATE_POLICY,
  IMPORT_CHUNK_LEASE_MS,
  IMPORT_CHUNK_STATUS,
  IMPORT_DEFAULT_REGION,
  IMPORT_ROW_ERROR_PREVIEW_MAX,
  IMPORT_STATUS,
} from "../constants/import.constant.js";
import {
  ContactImportChunkModel,
  type ContactImportChunkAttrs,
} from "../models/contact-import-chunk.model.js";
import {
  ContactImportJobModel,
  type ContactImportJobAttrs,
} from "../models/contact-import-job.model.js";
import { canTransition } from "../state/import-state-machine.js";
import type {
  ClaimChunkResult,
  CompleteChunkInput,
  CompleteChunkOptions,
  CompleteChunkResult,
  ContactImportChunkRecord,
  ContactImportJobRecord,
  CreateImportJobInput,
  IdentityField,
  ImportChunkDescriptor,
  ImportFieldMapping,
  ImportJobPatch,
  ImportProgressCounters,
  ImportRowError,
  ImportStatus,
  ImportWorkspaceId,
  MergeRules,
  TransitionResult,
} from "../types/import.types.js";

const FIELD_TARGETS: readonly ImportFieldMapping["target"][] = [
  "name",
  "email",
  "phone",
  "status",
  "tags",
  "whatsapp.optIn",
  "ignore",
];

function isFieldTarget(value: string): value is ImportFieldMapping["target"] {
  return FIELD_TARGETS.some((target) => target === value);
}

function asMapping(items: ContactImportJobAttrs["mapping"]): ImportFieldMapping[] {
  return items.flatMap((item) => {
    if (!isFieldTarget(item.target)) {
      return [];
    }
    const transform =
      item.transform === "trim" || item.transform === "lowercase"
        ? item.transform
        : "none";
    return [
      {
        source: item.source,
        target: item.target,
        transform,
      },
    ];
  });
}

function asIdentityKeys(keys: string[]): IdentityField[] {
  return keys.filter((key): key is IdentityField => key === "phone" || key === "email");
}

function asEmptyOnly(fields: string[]): MergeRules["emptyOnly"] {
  return fields.filter(
    (field): field is MergeRules["emptyOnly"][number] =>
      field === "name" || field === "email" || field === "phone" || field === "tags",
  );
}

export interface ClaimChunkOptions {
  leaseMs?: number;
  now?: Date;
}

function requireObjectId(value: string, field: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(value)) {
    throw HttpError.badRequest(`Invalid ${field}`);
  }
  return new Types.ObjectId(value);
}

function workspaceFilter(workspaceId: ImportWorkspaceId) {
  return {
    organizationId: requireObjectId(workspaceId.organizationId, "organizationId"),
    accountId: requireObjectId(workspaceId.accountId, "accountId"),
  };
}

function isDuplicateKey(error: unknown): boolean {
  return error instanceof MongoServerError && error.code === 11000;
}

function isUnorderedDuplicate(error: unknown): boolean {
  if (isDuplicateKey(error)) {
    return true;
  }
  if (typeof error !== "object" || error === null || !("writeErrors" in error)) {
    return false;
  }
  const writeErrors = error.writeErrors;
  if (!Array.isArray(writeErrors) || writeErrors.length === 0) {
    return false;
  }
  return writeErrors.every((item) => {
    return typeof item === "object" && item !== null && "code" in item && item.code === 11000;
  });
}

function insertedCountFromError(error: unknown): number {
  if (typeof error !== "object" || error === null) {
    return 0;
  }
  if ("insertedDocs" in error && Array.isArray(error.insertedDocs)) {
    return error.insertedDocs.length;
  }
  if ("result" in error && typeof error.result === "object" && error.result !== null) {
    const result = error.result;
    if ("insertedCount" in result && typeof result.insertedCount === "number") {
      return result.insertedCount;
    }
    if ("nInserted" in result && typeof result.nInserted === "number") {
      return result.nInserted;
    }
  }
  return 0;
}

function leaseExpiry(now: Date, leaseMs: number): Date {
  return new Date(now.getTime() + leaseMs);
}

function isLeaseActive(chunk: ContactImportChunkAttrs, now: Date): boolean {
  return (
    chunk.status === IMPORT_CHUNK_STATUS.PROCESSING &&
    chunk.leaseExpiresAt !== undefined &&
    chunk.leaseExpiresAt.getTime() > now.getTime()
  );
}

function toJobRecord(doc: ContactImportJobAttrs & { _id: Types.ObjectId }): ContactImportJobRecord {
  return {
    id: String(doc._id),
    organizationId: String(doc.organizationId),
    accountId: String(doc.accountId),
    createdBy: String(doc.createdBy),
    clientRequestId: doc.clientRequestId,
    status: doc.status,
    file: {
      bucket: doc.file.bucket,
      key: doc.file.key,
      fileName: doc.file.fileName,
      mimeType: doc.file.mimeType,
      byteSize: doc.file.byteSize,
      sha256: doc.file.sha256,
      detected: doc.file.detected,
    },
    policy: doc.policy,
    identity: {
      keys: asIdentityKeys(
        doc.identity.keys.length
          ? doc.identity.keys
          : [...DEFAULT_IMPORT_IDENTITY_KEYS],
      ),
    },
    mapping: asMapping(doc.mapping),
    merge: {
      emptyOnly: asEmptyOnly(
        doc.merge.emptyOnly.length
          ? doc.merge.emptyOnly
          : [...DEFAULT_MERGE_EMPTY_ONLY],
      ),
      tags: doc.merge.tags,
      allowStatusUpgrade: doc.merge.allowStatusUpgrade,
    },
    defaultCountry: doc.defaultCountry || IMPORT_DEFAULT_REGION,
    defaultAssigneeId: doc.defaultAssigneeId ? String(doc.defaultAssigneeId) : undefined,
    consentAttestation: doc.consentAttestation
      ? {
          confirmed: true as const,
          userId: String(doc.consentAttestation.userId),
          at: doc.consentAttestation.at,
          ip: doc.consentAttestation.ip,
          userAgent: doc.consentAttestation.userAgent,
          textVersion: doc.consentAttestation.textVersion,
        }
      : undefined,
    quota: doc.quota
      ? {
          status: doc.quota.status,
          reservedRows: doc.quota.reservedRows,
          settledInserted: doc.quota.settledInserted,
        }
      : undefined,
    dryRun: doc.dryRun?.windowStartedAt
      ? { windowStartedAt: doc.dryRun.windowStartedAt, count: doc.dryRun.count ?? 0 }
      : undefined,
    sampleRows: doc.sampleRows,
    headers: doc.headers,
    cursor: { ...doc.cursor },
    counters: {
      totalRows: doc.counters.totalRows,
      processed: doc.counters.processed,
      inserted: doc.counters.inserted,
      updated: doc.counters.updated,
      skipped: doc.counters.skipped,
      failed: doc.counters.failed,
      duplicates: doc.counters.duplicates ?? 0,
    },
    rowErrorPreview: doc.rowErrorPreview.map((row) => ({
      rowNumber: row.rowNumber,
      reason: row.reason,
      column: row.column,
      rawValue: row.rawValue,
      raw: [...row.raw],
    })),
    cancelRequested: doc.cancelRequested,
    pauseRequested: doc.pauseRequested,
    errorMessage: doc.errorMessage,
    errorReportKey: doc.errorReportKey,
    totalRows: doc.totalRows ?? 0,
    totalChunks: doc.totalChunks ?? 0,
    startedAt: doc.startedAt,
    completedAt: doc.completedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toChunkRecord(
  doc: ContactImportChunkAttrs & { _id: Types.ObjectId },
): ContactImportChunkRecord {
  return {
    id: String(doc._id),
    jobId: String(doc.jobId),
    organizationId: String(doc.organizationId),
    accountId: String(doc.accountId),
    index: doc.index,
    startRow: doc.startRow,
    endRow: doc.endRow,
    byteOffsetStart: doc.byteOffsetStart,
    byteOffsetEnd: doc.byteOffsetEnd,
    status: doc.status,
    attempts: doc.attempts,
    inserted: doc.inserted,
    updated: doc.updated,
    skipped: doc.skipped,
    failed: doc.failed,
    duplicates: doc.duplicates ?? 0,
    totalsApplied: doc.totalsApplied ?? false,
    leaseToken: doc.leaseToken,
    leaseExpiresAt: doc.leaseExpiresAt,
    error: doc.error,
    lastError: doc.lastError,
    lockedAt: doc.lockedAt,
    completedAt: doc.completedAt,
  };
}

function emptyCounters(): ImportProgressCounters {
  return {
    totalRows: 0,
    processed: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    duplicates: 0,
  };
}

export class ContactImportRepository {
  async createJob(input: CreateImportJobInput): Promise<ContactImportJobRecord> {
    const workspace = workspaceFilter(input.workspaceId);
    const clientRequestId = input.clientRequestId?.trim();

    if (clientRequestId) {
      const existing = await ContactImportJobModel.findOne({
        ...workspace,
        clientRequestId,
      }).lean();
      if (existing) {
        return toJobRecord(existing);
      }
    }

    try {
      const created = await ContactImportJobModel.create({
        ...(input.id ? { _id: requireObjectId(input.id, "jobId") } : {}),
        ...workspace,
        createdBy: requireObjectId(input.createdBy, "createdBy"),
        ...(clientRequestId ? { clientRequestId } : {}),
        status: IMPORT_STATUS.UPLOADED,
        file: input.file,
        policy: input.policy ?? DUPLICATE_POLICY.UPDATE,
        identity: input.identity ?? { keys: [...DEFAULT_IMPORT_IDENTITY_KEYS] },
        merge: input.merge ?? {
          emptyOnly: [...DEFAULT_MERGE_EMPTY_ONLY],
          tags: "union",
          allowStatusUpgrade: false,
        },
        defaultCountry: IMPORT_DEFAULT_REGION,
        mapping: [],
        sampleRows: [],
        headers: [],
        cursor: {
          byteOffset: 0,
          rowNumber: 0,
          sheetIndex: 0,
          chunkIndex: -1,
        },
        counters: emptyCounters(),
        rowErrorPreview: [],
        cancelRequested: false,
        pauseRequested: false,
      });
      return toJobRecord(created.toObject());
    } catch (error) {
      if (!isDuplicateKey(error) || !clientRequestId) {
        throw error;
      }
      const raced = await ContactImportJobModel.findOne({
        ...workspace,
        clientRequestId,
      }).lean();
      if (!raced) {
        throw error;
      }
      return toJobRecord(raced);
    }
  }

  async getJob(
    workspaceId: ImportWorkspaceId,
    jobId: string,
  ): Promise<ContactImportJobRecord | null> {
    const doc = await ContactImportJobModel.findOne({
      _id: requireObjectId(jobId, "jobId"),
      ...workspaceFilter(workspaceId),
    }).lean();
    if (!doc) {
      return null;
    }
    return toJobRecord(doc);
  }

  async transition(
    workspaceId: ImportWorkspaceId,
    jobId: string,
    from: ImportStatus,
    to: ImportStatus,
    patch: ImportJobPatch = {},
  ): Promise<TransitionResult<ContactImportJobRecord>> {
    if (!canTransition(from, to)) {
      return { ok: false, reason: "illegal_transition" };
    }
    const extra: Record<string, unknown> = { ...patch, status: to };
    if (typeof patch.totalRows === "number") {
      extra["counters.totalRows"] = patch.totalRows;
    }
    if (to === IMPORT_STATUS.PROCESSING && !patch.startedAt) {
      extra.startedAt = new Date();
    }
    if (
      (to === IMPORT_STATUS.COMPLETED ||
        to === IMPORT_STATUS.COMPLETED_WITH_ERRORS ||
        to === IMPORT_STATUS.FAILED ||
        to === IMPORT_STATUS.CANCELLED) &&
      !patch.completedAt
    ) {
      extra.completedAt = new Date();
    }
    const doc = await ContactImportJobModel.findOneAndUpdate(
      {
        _id: requireObjectId(jobId, "jobId"),
        ...workspaceFilter(workspaceId),
        status: from,
      },
      { $set: extra },
      { new: true },
    ).lean();
    if (doc) {
      return { ok: true, job: toJobRecord(doc) };
    }
    const existing = await this.getJob(workspaceId, jobId);
    if (!existing) {
      return { ok: false, reason: "not_found" };
    }
    return { ok: false, reason: "conflict" };
  }

  async claimChunk(
    workspaceId: ImportWorkspaceId,
    jobId: string,
    descriptor: ImportChunkDescriptor,
    options: ClaimChunkOptions = {},
  ): Promise<ClaimChunkResult> {
    const job = await this.getJob(workspaceId, jobId);
    if (!job) {
      return { ok: false, reason: "not_found" };
    }
    const workspace = workspaceFilter(workspaceId);
    const jobObjectId = requireObjectId(jobId, "jobId");
    const scoped = {
      jobId: jobObjectId,
      index: descriptor.index,
      ...workspace,
    };
    const now = options.now ?? new Date();
    const leaseMs = options.leaseMs ?? IMPORT_CHUNK_LEASE_MS;
    const existing = await ContactImportChunkModel.findOne(scoped).lean();
    if (existing && existing.status === IMPORT_CHUNK_STATUS.DONE) {
      return { ok: true, alreadyDone: true, chunk: toChunkRecord(existing) };
    }
    if (existing && isLeaseActive(existing, now)) {
      return { ok: false, reason: "leased" };
    }

    const leaseToken = randomUUID();
    const leaseExpiresAt = leaseExpiry(now, leaseMs);
    const setFields = {
      status: IMPORT_CHUNK_STATUS.PROCESSING,
      startRow: descriptor.startRow,
      endRow: descriptor.endRow,
      byteOffsetStart: descriptor.byteOffsetStart,
      byteOffsetEnd: descriptor.byteOffsetEnd,
      lockedAt: now,
      leaseToken,
      leaseExpiresAt,
    };

    if (existing) {
      const claimed = await ContactImportChunkModel.findOneAndUpdate(
        {
          ...scoped,
          $or: [
            { status: IMPORT_CHUNK_STATUS.PENDING },
            {
              status: IMPORT_CHUNK_STATUS.PROCESSING,
              leaseExpiresAt: { $lte: now },
            },
            {
              status: IMPORT_CHUNK_STATUS.PROCESSING,
              leaseExpiresAt: { $exists: false },
            },
          ],
        },
        { $set: setFields, $inc: { attempts: 1 } },
        { new: true },
      ).lean();
      if (claimed) {
        return {
          ok: true,
          alreadyDone: false,
          chunk: toChunkRecord(claimed),
          leaseToken,
          leaseExpiresAt,
        };
      }
      const again = await ContactImportChunkModel.findOne(scoped).lean();
      if (!again) {
        return { ok: false, reason: "not_found" };
      }
      if (again.status === IMPORT_CHUNK_STATUS.DONE) {
        return { ok: true, alreadyDone: true, chunk: toChunkRecord(again) };
      }
      return { ok: false, reason: "leased" };
    }

    try {
      const created = await ContactImportChunkModel.create({
        ...scoped,
        ...setFields,
        attempts: 1,
        inserted: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        duplicates: 0,
        totalsApplied: false,
      });
      return {
        ok: true,
        alreadyDone: false,
        chunk: toChunkRecord(created.toObject()),
        leaseToken,
        leaseExpiresAt,
      };
    } catch (error) {
      if (!isDuplicateKey(error)) {
        throw error;
      }
      const raced = await ContactImportChunkModel.findOne(scoped).lean();
      if (!raced) {
        throw error;
      }
      if (raced.status === IMPORT_CHUNK_STATUS.DONE) {
        return { ok: true, alreadyDone: true, chunk: toChunkRecord(raced) };
      }
      return { ok: false, reason: "leased" };
    }
  }

  async heartbeat(
    workspaceId: ImportWorkspaceId,
    jobId: string,
    index: number,
    leaseToken: string,
    options: ClaimChunkOptions = {},
  ): Promise<boolean> {
    const now = options.now ?? new Date();
    const leaseMs = options.leaseMs ?? IMPORT_CHUNK_LEASE_MS;
    const doc = await ContactImportChunkModel.findOneAndUpdate(
      {
        jobId: requireObjectId(jobId, "jobId"),
        index,
        leaseToken,
        status: IMPORT_CHUNK_STATUS.PROCESSING,
        ...workspaceFilter(workspaceId),
      },
      {
        $set: {
          lockedAt: now,
          leaseExpiresAt: leaseExpiry(now, leaseMs),
        },
      },
      { new: true },
    ).lean();
    return Boolean(doc);
  }

  async completeChunk(
    workspaceId: ImportWorkspaceId,
    jobId: string,
    input: CompleteChunkInput,
    options: CompleteChunkOptions = {},
  ): Promise<CompleteChunkResult> {
    const workspace = workspaceFilter(workspaceId);
    const jobObjectId = requireObjectId(jobId, "jobId");
    const scoped = {
      jobId: jobObjectId,
      index: input.index,
      ...workspace,
    };
    const existing = await ContactImportChunkModel.findOne(scoped).lean();
    if (!existing) {
      return { applied: false, reason: "not_found" };
    }

    if (existing.status === IMPORT_CHUNK_STATUS.DONE) {
      if (options.applyJobTotals !== false) {
        await this.commitChunkTotals(workspaceId, jobId, input);
      }
      const chunk = await ContactImportChunkModel.findOne(scoped).lean();
      return {
        applied: false,
        reason: "already_done",
        chunk: chunk ? toChunkRecord(chunk) : toChunkRecord(existing),
      };
    }

    const completed = await ContactImportChunkModel.findOneAndUpdate(
      {
        ...scoped,
        status: IMPORT_CHUNK_STATUS.PROCESSING,
        leaseToken: input.leaseToken,
      },
      {
        $set: {
          status: IMPORT_CHUNK_STATUS.DONE,
          startRow: input.startRow,
          endRow: input.endRow,
          byteOffsetStart: input.byteOffsetStart,
          byteOffsetEnd: input.byteOffsetEnd,
          inserted: input.inserted,
          updated: input.updated,
          skipped: input.skipped,
          failed: input.failed,
          duplicates: input.duplicates,
          error: input.error,
          completedAt: new Date(),
          totalsApplied: false,
        },
      },
      { new: true },
    ).lean();

    if (!completed) {
      const again = await ContactImportChunkModel.findOne(scoped).lean();
      if (again && again.status === IMPORT_CHUNK_STATUS.DONE) {
        if (options.applyJobTotals !== false) {
          await this.commitChunkTotals(workspaceId, jobId, input);
        }
        return {
          applied: false,
          reason: "already_done",
          chunk: toChunkRecord(again),
        };
      }
      return { applied: false, reason: "lease_mismatch", chunk: again ? toChunkRecord(again) : undefined };
    }

    const job =
      options.applyJobTotals === false
        ? await this.getJob(workspaceId, jobId)
        : await this.commitChunkTotals(workspaceId, jobId, input);
    const latestJob = job ?? (await this.getJob(workspaceId, jobId));
    const latestChunk = await ContactImportChunkModel.findOne(scoped).lean();
    if (!latestJob || !latestChunk) {
      return { applied: false, reason: "not_found" };
    }
    return {
      applied: true,
      chunk: toChunkRecord(latestChunk),
      job: latestJob,
    };
  }

  async releaseChunk(
    workspaceId: ImportWorkspaceId,
    jobId: string,
    index: number,
    leaseToken: string,
    lastError?: string,
  ): Promise<boolean> {
    const setFields: Record<string, unknown> = {
      status: IMPORT_CHUNK_STATUS.PENDING,
    };
    if (lastError !== undefined) {
      setFields.lastError = lastError;
    }
    const doc = await ContactImportChunkModel.findOneAndUpdate(
      {
        jobId: requireObjectId(jobId, "jobId"),
        index,
        leaseToken,
        status: IMPORT_CHUNK_STATUS.PROCESSING,
        ...workspaceFilter(workspaceId),
      },
      {
        $set: setFields,
        $unset: { leaseToken: 1, leaseExpiresAt: 1, lockedAt: 1 },
      },
      { new: true },
    ).lean();
    return Boolean(doc);
  }

  async markChunkFailed(
    workspaceId: ImportWorkspaceId,
    jobId: string,
    index: number,
    leaseToken: string,
    lastError: string,
  ): Promise<ContactImportChunkRecord | null> {
    const doc = await ContactImportChunkModel.findOneAndUpdate(
      {
        jobId: requireObjectId(jobId, "jobId"),
        index,
        leaseToken,
        status: IMPORT_CHUNK_STATUS.PROCESSING,
        ...workspaceFilter(workspaceId),
      },
      {
        $set: {
          status: IMPORT_CHUNK_STATUS.FAILED,
          lastError,
          error: lastError,
          completedAt: new Date(),
        },
        $unset: { leaseToken: 1, leaseExpiresAt: 1 },
      },
      { new: true },
    ).lean();
    return doc ? toChunkRecord(doc) : null;
  }

  async insertChunks(
    workspaceId: ImportWorkspaceId,
    jobId: string,
    descriptors: ImportChunkDescriptor[],
  ): Promise<{ inserted: number; duplicate: number }> {
    if (descriptors.length === 0) {
      return { inserted: 0, duplicate: 0 };
    }
    const job = await this.getJob(workspaceId, jobId);
    if (!job) {
      throw HttpError.badRequest("Import job not found");
    }
    const workspace = workspaceFilter(workspaceId);
    const docs = descriptors.map((descriptor) => ({
      jobId: requireObjectId(jobId, "jobId"),
      ...workspace,
      index: descriptor.index,
      startRow: descriptor.startRow,
      endRow: descriptor.endRow,
      byteOffsetStart: descriptor.byteOffsetStart,
      byteOffsetEnd: descriptor.byteOffsetEnd,
      status: IMPORT_CHUNK_STATUS.PENDING,
      attempts: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      duplicates: 0,
      totalsApplied: false,
    }));
    try {
      const created = await ContactImportChunkModel.insertMany(docs, { ordered: false });
      return { inserted: created.length, duplicate: 0 };
    } catch (error) {
      if (!isUnorderedDuplicate(error)) {
        throw error;
      }
      const inserted = insertedCountFromError(error);
      return { inserted, duplicate: Math.max(0, docs.length - inserted) };
    }
  }

  async listChunks(
    workspaceId: ImportWorkspaceId,
    jobId: string,
  ): Promise<ContactImportChunkRecord[]> {
    const docs = await ContactImportChunkModel.find({
      jobId: requireObjectId(jobId, "jobId"),
      ...workspaceFilter(workspaceId),
    })
      .sort({ index: 1 })
      .lean();
    return docs.map((doc) => toChunkRecord(doc));
  }

  async getChunk(
    workspaceId: ImportWorkspaceId,
    jobId: string,
    index: number,
  ): Promise<ContactImportChunkRecord | null> {
    const doc = await ContactImportChunkModel.findOne({
      jobId: requireObjectId(jobId, "jobId"),
      index,
      ...workspaceFilter(workspaceId),
    }).lean();
    return doc ? toChunkRecord(doc) : null;
  }

  async countChunksByStatus(
    workspaceId: ImportWorkspaceId,
    jobId: string,
  ): Promise<Record<string, number>> {
    const rows = await ContactImportChunkModel.aggregate<{ _id: string; count: number }>([
      {
        $match: {
          jobId: requireObjectId(jobId, "jobId"),
          ...workspaceFilter(workspaceId),
        },
      },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const counts: Record<string, number> = {};
    for (const row of rows) {
      counts[row._id] = row.count;
    }
    return counts;
  }

  async countOrgJobsByStatus(organizationId: string, status: ImportStatus): Promise<number> {
    return ContactImportJobModel.countDocuments({
      organizationId: requireObjectId(organizationId, "organizationId"),
      status,
    });
  }

  async listJobsByStatus(
    status: ImportStatus,
    limit: number,
  ): Promise<ContactImportJobRecord[]> {
    const docs = await ContactImportJobModel.find({ status })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean();
    return docs.map((doc) => toJobRecord(doc));
  }

  async listExpiredLeaseChunks(
    now: Date,
    limit: number,
  ): Promise<ContactImportChunkRecord[]> {
    const docs = await ContactImportChunkModel.find({
      status: IMPORT_CHUNK_STATUS.PROCESSING,
      leaseExpiresAt: { $lte: now },
    })
      .sort({ leaseExpiresAt: 1 })
      .limit(limit)
      .lean();
    return docs.map((doc) => toChunkRecord(doc));
  }

  async resetExpiredLease(
    workspaceId: ImportWorkspaceId,
    jobId: string,
    index: number,
    now: Date,
  ): Promise<boolean> {
    const doc = await ContactImportChunkModel.findOneAndUpdate(
      {
        jobId: requireObjectId(jobId, "jobId"),
        index,
        status: IMPORT_CHUNK_STATUS.PROCESSING,
        leaseExpiresAt: { $lte: now },
        ...workspaceFilter(workspaceId),
      },
      {
        $set: { status: IMPORT_CHUNK_STATUS.PENDING },
        $unset: { leaseToken: 1, leaseExpiresAt: 1, lockedAt: 1 },
      },
      { new: true },
    ).lean();
    return Boolean(doc);
  }

  async listTerminalJobs(completedBefore: Date, limit: number): Promise<ContactImportJobRecord[]> {
    const docs = await ContactImportJobModel.find({
      status: {
        $in: [
          IMPORT_STATUS.COMPLETED,
          IMPORT_STATUS.COMPLETED_WITH_ERRORS,
          IMPORT_STATUS.FAILED,
          IMPORT_STATUS.CANCELLED,
        ],
      },
      completedAt: { $lte: completedBefore },
    })
      .sort({ completedAt: 1 })
      .limit(limit)
      .lean();
    return docs.map((doc) => toJobRecord(doc));
  }

  async listAbandonedUploads(createdBefore: Date, limit: number): Promise<ContactImportJobRecord[]> {
    const docs = await ContactImportJobModel.find({
      status: IMPORT_STATUS.UPLOADED,
      createdAt: { $lte: createdBefore },
    })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean();
    return docs.map((doc) => toJobRecord(doc));
  }

  async deleteChunksForJob(workspaceId: ImportWorkspaceId, jobId: string): Promise<number> {
    const result = await ContactImportChunkModel.deleteMany({
      jobId: requireObjectId(jobId, "jobId"),
      ...workspaceFilter(workspaceId),
    });
    return result.deletedCount;
  }

  async deleteJob(workspaceId: ImportWorkspaceId, jobId: string): Promise<boolean> {
    const result = await ContactImportJobModel.deleteOne({
      _id: requireObjectId(jobId, "jobId"),
      ...workspaceFilter(workspaceId),
    });
    return result.deletedCount === 1;
  }

  async patchJob(
    workspaceId: ImportWorkspaceId,
    jobId: string,
    patch: ImportJobPatch,
  ): Promise<ContactImportJobRecord | null> {
    const extra: Record<string, unknown> = { ...patch };
    if (typeof patch.totalRows === "number") {
      extra["counters.totalRows"] = patch.totalRows;
    }
    const doc = await ContactImportJobModel.findOneAndUpdate(
      {
        _id: requireObjectId(jobId, "jobId"),
        ...workspaceFilter(workspaceId),
      },
      { $set: extra },
      { new: true },
    ).lean();
    return doc ? toJobRecord(doc) : null;
  }

  async recordRowErrors(
    workspaceId: ImportWorkspaceId,
    jobId: string,
    errors: ImportRowError[],
  ): Promise<ContactImportJobRecord | null> {
    const incoming = errors.map((error) => ({
      rowNumber: error.rowNumber,
      reason: error.reason,
      column: error.column,
      rawValue: error.rawValue,
      raw: [...error.raw],
    }));
    const incomingRowNumbers = incoming.map((error) => error.rowNumber);
    const doc = await ContactImportJobModel.findOneAndUpdate(
      {
        _id: requireObjectId(jobId, "jobId"),
        ...workspaceFilter(workspaceId),
      },
      [
        {
          $set: {
            rowErrorPreview: {
              $slice: [
                {
                  $sortArray: {
                    input: {
                      $concatArrays: [
                        {
                          $filter: {
                            input: { $ifNull: ["$rowErrorPreview", []] },
                            as: "row",
                            cond: {
                              $not: {
                                $in: ["$$row.rowNumber", incomingRowNumbers],
                              },
                            },
                          },
                        },
                        incoming,
                      ],
                    },
                    sortBy: { rowNumber: 1 },
                  },
                },
                IMPORT_ROW_ERROR_PREVIEW_MAX,
              ],
            },
          },
        },
      ],
      { new: true },
    ).lean();
    return doc ? toJobRecord(doc) : null;
  }

  async replaceJobTotals(
    workspaceId: ImportWorkspaceId,
    jobId: string,
    snapshot: ImportProgressCounters,
  ): Promise<ContactImportJobRecord | null> {
    const doc = await ContactImportJobModel.findOneAndUpdate(
      {
        _id: requireObjectId(jobId, "jobId"),
        ...workspaceFilter(workspaceId),
      },
      {
        $set: {
          "counters.totalRows": snapshot.totalRows,
          "counters.processed": snapshot.processed,
          "counters.inserted": snapshot.inserted,
          "counters.updated": snapshot.updated,
          "counters.skipped": snapshot.skipped,
          "counters.failed": snapshot.failed,
          "counters.duplicates": snapshot.duplicates,
        },
      },
      { new: true },
    ).lean();
    return doc ? toJobRecord(doc) : null;
  }

  async listUnappliedDoneChunks(limit: number): Promise<ContactImportChunkRecord[]> {
    const docs = await ContactImportChunkModel.find({
      status: IMPORT_CHUNK_STATUS.DONE,
      totalsApplied: { $ne: true },
    })
      .sort({ completedAt: 1 })
      .limit(limit)
      .lean();
    return docs.map((doc) => toChunkRecord(doc));
  }

  async reapplyChunkTotals(
    workspaceId: ImportWorkspaceId,
    jobId: string,
    input: CompleteChunkInput,
  ): Promise<ContactImportJobRecord | null> {
    return this.commitChunkTotals(workspaceId, jobId, input);
  }

  async applyProgressDelta(
    workspaceId: ImportWorkspaceId,
    jobId: string,
    snapshot: ImportProgressCounters,
  ): Promise<ContactImportJobRecord | null> {
    const doc = await ContactImportJobModel.findOneAndUpdate(
      {
        _id: requireObjectId(jobId, "jobId"),
        ...workspaceFilter(workspaceId),
      },
      {
        $max: {
          "counters.totalRows": snapshot.totalRows,
          "counters.processed": snapshot.processed,
          "counters.inserted": snapshot.inserted,
          "counters.updated": snapshot.updated,
          "counters.skipped": snapshot.skipped,
          "counters.failed": snapshot.failed,
          "counters.duplicates": snapshot.duplicates,
        },
      },
      { new: true },
    ).lean();
    return doc ? toJobRecord(doc) : null;
  }

  private async commitChunkTotals(
    workspaceId: ImportWorkspaceId,
    jobId: string,
    input: CompleteChunkInput,
  ): Promise<ContactImportJobRecord | null> {
    const flipped = await ContactImportChunkModel.findOneAndUpdate(
      {
        jobId: requireObjectId(jobId, "jobId"),
        index: input.index,
        status: IMPORT_CHUNK_STATUS.DONE,
        totalsApplied: { $ne: true },
        ...workspaceFilter(workspaceId),
      },
      { $set: { totalsApplied: true } },
      { new: true },
    ).lean();
    if (!flipped) {
      return this.getJob(workspaceId, jobId);
    }
    return this.applyChunkTotals(workspaceId, jobId, input);
  }

  private async applyChunkTotals(
    workspaceId: ImportWorkspaceId,
    jobId: string,
    input: CompleteChunkInput,
  ): Promise<ContactImportJobRecord | null> {
    const processed =
      input.inserted + input.updated + input.skipped + input.failed + input.duplicates;
    const doc = await ContactImportJobModel.findOneAndUpdate(
      {
        _id: requireObjectId(jobId, "jobId"),
        ...workspaceFilter(workspaceId),
      },
      {
        $inc: {
          "counters.inserted": input.inserted,
          "counters.updated": input.updated,
          "counters.skipped": input.skipped,
          "counters.failed": input.failed,
          "counters.duplicates": input.duplicates,
          "counters.processed": processed,
        },
        $max: {
          "cursor.chunkIndex": input.index,
          "cursor.rowNumber": input.endRow,
          "cursor.byteOffset": input.byteOffsetEnd,
        },
      },
      { new: true },
    ).lean();
    return doc ? toJobRecord(doc) : null;
  }

  async listAccountJobs(
    workspaceId: ImportWorkspaceId,
    options: { status?: ImportStatus; cursor?: string; limit?: number } = {},
  ): Promise<{ jobs: ContactImportJobRecord[]; nextCursor?: string }> {
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
    const filter: Record<string, unknown> = { ...workspaceFilter(workspaceId) };
    if (options.status) {
      filter.status = options.status;
    }
    if (options.cursor) {
      const parsed = decodeJobCursor(options.cursor);
      filter.$or = [
        { createdAt: { $lt: parsed.createdAt } },
        { createdAt: parsed.createdAt, _id: { $lt: parsed.id } },
      ];
    }
    const docs = await ContactImportJobModel.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .lean();
    const extra = docs.length > limit;
    const page = extra ? docs.slice(0, limit) : docs;
    const last = page[page.length - 1];
    return {
      jobs: page.map((doc) => toJobRecord(doc)),
      nextCursor: extra && last ? encodeJobCursor(last.createdAt, last._id) : undefined,
    };
  }

  async countNonTerminalJobs(workspaceId: ImportWorkspaceId): Promise<number> {
    return ContactImportJobModel.countDocuments({
      ...workspaceFilter(workspaceId),
      status: {
        $nin: [
          IMPORT_STATUS.COMPLETED,
          IMPORT_STATUS.COMPLETED_WITH_ERRORS,
          IMPORT_STATUS.FAILED,
          IMPORT_STATUS.CANCELLED,
        ],
      },
    });
  }

  async countJobsCreatedSince(workspaceId: ImportWorkspaceId, since: Date): Promise<number> {
    return ContactImportJobModel.countDocuments({
      ...workspaceFilter(workspaceId),
      createdAt: { $gte: since },
    });
  }

  async claimQuotaSettlement(
    workspaceId: ImportWorkspaceId,
    jobId: string,
    status: "settled" | "released",
    settledInserted: number,
    reservedRows?: number,
  ): Promise<boolean> {
    const doc = await ContactImportJobModel.findOneAndUpdate(
      {
        _id: requireObjectId(jobId, "jobId"),
        ...workspaceFilter(workspaceId),
        "quota.status": { $nin: ["settled", "released"] },
      },
      {
        $set: {
          quota: {
            status,
            reservedRows,
            settledInserted,
          },
        },
      },
      { new: true },
    ).lean();
    return Boolean(doc);
  }
}

function encodeJobCursor(createdAt: Date, id: Types.ObjectId): string {
  return Buffer.from(`${createdAt.toISOString()}|${String(id)}`, "utf8").toString("base64url");
}

function decodeJobCursor(cursor: string): { createdAt: Date; id: Types.ObjectId } {
  const raw = Buffer.from(cursor, "base64url").toString("utf8");
  const [iso, id] = raw.split("|");
  if (!iso || !id || !Types.ObjectId.isValid(id)) {
    throw HttpError.badRequest("Invalid list cursor");
  }
  return { createdAt: new Date(iso), id: new Types.ObjectId(id) };
}

export const contactImportRepository = new ContactImportRepository();
