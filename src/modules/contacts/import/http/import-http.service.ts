import { Types } from "mongoose";
import { Readable } from "node:stream";
import { HttpError } from "../../../../utils/http.error.js";
import {
  IMPORT_CONSENT_TEXT_VERSION,
  IMPORT_ERROR_CODE,
  IMPORT_ERROR_DOWNLOAD_EXPIRES_SEC,
  IMPORT_FIELD_TARGET,
  IMPORT_MAX_FILE_BYTES,
  IMPORT_PRESIGN_EXPIRES_SEC,
  IMPORT_PROBE_BYTES,
  IMPORT_STATUS,
  maxActiveImportsPerAccount,
  maxDryRunsPerHour,
  maxImportCreatesPerHour,
} from "../constants/import.constant.js";
import { parseDryRunRequest, parseStartImportRequest } from "../dtos/import.dto.js";
import { PermanentError } from "../errors/import-worker.errors.js";
import { IMPORT_JOB_NAME, validateJobId } from "../queue/queue-port.js";
import type { ImportOrchestrationDeps } from "../runtime/deps.js";
import {
  cancelImport,
  pauseImport,
  resumeImport,
  startImport,
} from "../services/import-lifecycle.service.js";
import { sourceObjectKey } from "../store/file-keys.js";
import { errorReportKey } from "../store/file-keys.js";
import type {
  ContactImportJobRecord,
  ImportConsentAttestation,
  ImportStatus,
  ImportWorkspaceId,
  StartImportRequest,
} from "../types/import.types.js";
import { ImportStatusSchema } from "../types/import.types.js";
import { CreateImportBodySchema, ListImportsQuerySchema, type CreateImportBody } from "./http-dtos.js";
import { assertImportMagic } from "./magic-bytes.js";
import { LocalFilePresigner, type FilePresigner } from "./presign.js";
import type { ImportQuotaPort } from "./quota-port.js";
import { avScanEnabled, type ScanPort } from "./scan-port.js";
import { ImportSseHub } from "./sse-poller.js";
import { suggestMapping } from "./suggest-mapping.js";
import { buildImportConfig } from "./import-config.js";
import { runImportDryRun } from "./dry-run.js";

const PREVIEW_STATUSES = new Set<string>([
  IMPORT_STATUS.MAPPING,
  IMPORT_STATUS.QUEUED,
  IMPORT_STATUS.PROCESSING,
  IMPORT_STATUS.PAUSED,
  IMPORT_STATUS.COMPLETED,
  IMPORT_STATUS.COMPLETED_WITH_ERRORS,
]);

const STARTED_STATUSES = new Set<string>([
  IMPORT_STATUS.QUEUED,
  IMPORT_STATUS.PROCESSING,
  IMPORT_STATUS.PAUSED,
]);

const COMPLETED_STATUSES = new Set<string>([
  IMPORT_STATUS.COMPLETED,
  IMPORT_STATUS.COMPLETED_WITH_ERRORS,
]);

export interface ImportActor {
  userId: string;
  organizationId: string;
  ip?: string;
  userAgent?: string;
}

export interface ContactImportHttpDeps extends ImportOrchestrationDeps {
  presigner: FilePresigner;
  scanner: ScanPort;
  quota: ImportQuotaPort;
  sse: ImportSseHub;
  bucket?: string;
}

export class ContactImportHttpService {
  constructor(private readonly deps: ContactImportHttpDeps) {}

  get sse(): ImportSseHub {
    return this.deps.sse;
  }

  get repository() {
    return this.deps.repository;
  }

  workspace(actor: ImportActor, accountId: string): ImportWorkspaceId {
    return { organizationId: actor.organizationId, accountId };
  }

  async createJob(
    actor: ImportActor,
    accountId: string,
    body: unknown,
    idempotencyKey?: string,
  ) {
    const parsed = parseCreateBody(body);
    const extension = fileExtension(parsed.fileName);
    const ws = this.workspace(actor, accountId);
    await this.assertCreateLimits(ws);

    const jobId = new Types.ObjectId().toHexString();
    const key = sourceObjectKey(actor.organizationId, accountId, jobId, extension);
    const job = await this.deps.repository.createJob({
      id: jobId,
      workspaceId: ws,
      createdBy: actor.userId,
      clientRequestId: idempotencyKey?.trim() || undefined,
      file: {
        bucket: this.deps.bucket ?? "local",
        key,
        fileName: parsed.fileName,
        mimeType: parsed.contentType,
        byteSize: parsed.fileSize,
      },
    });
    const canUpload = job.status === IMPORT_STATUS.UPLOADED;
    const upload = canUpload
      ? await this.deps.presigner.createUploadPost(
          job.file.key,
          IMPORT_MAX_FILE_BYTES,
          IMPORT_PRESIGN_EXPIRES_SEC,
        )
      : undefined;
    return {
      id: job.id,
      status: job.status,
      key: job.file.key,
      expiresInSec: upload?.expiresInSec ?? IMPORT_PRESIGN_EXPIRES_SEC,
      maxBytes: IMPORT_MAX_FILE_BYTES,
      ...(upload
        ? {
            uploadUrl: upload.url,
            upload: {
              url: upload.url,
              fields: upload.fields,
              key: upload.key,
              expiresInSec: upload.expiresInSec,
              maxBytes: upload.maxBytes,
              conditions: upload.conditions,
            },
          }
        : {}),
    };
  }

  async putLocalSource(
    actor: ImportActor,
    accountId: string,
    jobId: string,
    file: { buffer: Buffer; size: number } | undefined,
    fieldKey?: string,
  ) {
    if (!(this.deps.presigner instanceof LocalFilePresigner)) {
      throw HttpError.conflict(
        "Direct upload is only available when IMPORT_FILE_STORE=local",
        undefined,
        IMPORT_ERROR_CODE.IMPORT_INVALID_STATE,
      );
    }
    const ws = this.workspace(actor, accountId);
    const job = await this.requireJob(ws, jobId);
    if (job.status !== IMPORT_STATUS.UPLOADED) {
      throw HttpError.conflict(
        "This import is not waiting for a file",
        { status: job.status },
        IMPORT_ERROR_CODE.IMPORT_INVALID_STATE,
      );
    }
    if (!file || file.size < 1) {
      throw HttpError.badRequest("File is required", undefined, IMPORT_ERROR_CODE.IMPORT_EMPTY);
    }
    if (file.size > IMPORT_MAX_FILE_BYTES) {
      throw HttpError.badRequest(
        "Uploaded object exceeds the size cap",
        { size: file.size },
        IMPORT_ERROR_CODE.IMPORT_FILE_TOO_LARGE,
      );
    }
    if (file.size !== job.file.byteSize) {
      throw HttpError.badRequest(
        "Uploaded object size does not match the declared size",
        { size: file.size, declared: job.file.byteSize },
        IMPORT_ERROR_CODE.IMPORT_SIZE_MISMATCH,
      );
    }
    if (fieldKey && fieldKey !== job.file.key) {
      throw HttpError.badRequest(
        "Upload key does not match this job",
        { key: fieldKey },
        IMPORT_ERROR_CODE.IMPORT_INVALID_STATE,
      );
    }
    await this.deps.store.putStream(job.file.key, Readable.from(file.buffer));
    return toJobView(job);
  }

  async completeUpload(actor: ImportActor, accountId: string, jobId: string) {
    const ws = this.workspace(actor, accountId);
    const job = await this.requireJob(ws, jobId);
    if (job.status !== IMPORT_STATUS.UPLOADED && job.status !== IMPORT_STATUS.SCANNING) {
      return toJobView(job);
    }
    await this.assertUploadedObject(job);
    if (avScanEnabled() || job.status === IMPORT_STATUS.SCANNING) {
      if (job.status === IMPORT_STATUS.UPLOADED) {
        const scanning = await this.deps.repository.transition(
          ws,
          jobId,
          IMPORT_STATUS.UPLOADED,
          IMPORT_STATUS.SCANNING,
        );
        if (!scanning.ok && scanning.reason === "not_found") {
          throw notFound();
        }
      }
      const scan = await this.deps.scanner.scan(job.file.key);
      if (!scan.clean) {
        await this.deps.repository.transition(
          ws,
          jobId,
          IMPORT_STATUS.SCANNING,
          IMPORT_STATUS.FAILED,
          { errorMessage: scan.reason ?? "AV scan rejected the file" },
        );
        throw HttpError.badRequest(
          scan.reason ?? "File failed the antivirus scan",
          undefined,
          IMPORT_ERROR_CODE.IMPORT_SCAN_REJECTED,
        );
      }
    }
    await this.deps.queue.enqueue(
      IMPORT_JOB_NAME.VALIDATE,
      {
        jobId: job.id,
        organizationId: job.organizationId,
        accountId: job.accountId,
      },
      { jobId: validateJobId(job.id) },
    );
    const latest = await this.requireJob(ws, jobId);
    return toJobView(latest);
  }

  async getConfig(actor: ImportActor) {
    return buildImportConfig(actor.organizationId);
  }

  async preview(actor: ImportActor, accountId: string, jobId: string) {
    const job = await this.requireJob(this.workspace(actor, accountId), jobId);
    if (!PREVIEW_STATUSES.has(job.status)) {
      throw HttpError.conflict(
        "Preview is available after the file has been validated",
        { status: job.status },
        IMPORT_ERROR_CODE.IMPORT_INVALID_STATE,
      );
    }
    return {
      headers: job.headers,
      sampleRows: job.sampleRows.slice(0, 20),
      totalRows: job.totalRows,
      sheetNames: job.file.detected?.sheetNames ?? [],
      detected: job.file.detected,
      suggestedMapping: suggestMapping(job.headers),
    };
  }

  async start(actor: ImportActor, accountId: string, jobId: string, body: unknown) {
    const ws = this.workspace(actor, accountId);
    const job = await this.requireJob(ws, jobId);
    if (STARTED_STATUSES.has(job.status)) {
      return toJobView(job);
    }
    if (job.status !== IMPORT_STATUS.MAPPING) {
      throw HttpError.conflict(
        "Import can only be started from the mapping state",
        { status: job.status },
        IMPORT_ERROR_CODE.IMPORT_INVALID_STATE,
      );
    }
    const start = parseStartImportRequest(body);
    assertStartMapping(job.headers, start);
    await this.deps.quota.assertCanInsert(actor.organizationId, job.totalRows);
    const patch: {
      quota: { status: "checked"; reservedRows: number };
      consentAttestation?: ImportConsentAttestation;
    } = {
      quota: { status: "checked", reservedRows: job.totalRows },
    };
    if (start.consentAttestation?.confirmed) {
      patch.consentAttestation = {
        confirmed: true,
        userId: actor.userId,
        at: new Date(),
        ip: actor.ip,
        userAgent: actor.userAgent,
        textVersion: start.consentAttestation.textVersion ?? IMPORT_CONSENT_TEXT_VERSION,
      };
    }
    await this.deps.repository.patchJob(ws, jobId, patch);
    const result = await startImport(this.deps, ws, jobId, start);
    if (!result.ok) {
      if (result.reason === "not_found") {
        throw notFound();
      }
      throw HttpError.conflict(
        "Import could not be started",
        { reason: result.reason },
        IMPORT_ERROR_CODE.IMPORT_INVALID_STATE,
      );
    }
    return toJobView(result.job);
  }

  async dryRun(actor: ImportActor, accountId: string, jobId: string, body: unknown) {
    const ws = this.workspace(actor, accountId);
    const job = await this.requireJob(ws, jobId);
    if (job.status !== IMPORT_STATUS.MAPPING) {
      throw HttpError.conflict(
        "Dry-run is only available while the import is in the mapping state",
        { status: job.status },
        IMPORT_ERROR_CODE.IMPORT_INVALID_STATE,
      );
    }
    const request = parseDryRunRequest(body);
    assertStartMapping(job.headers, request);
    await this.assertDryRunLimit(ws, job);
    return runImportDryRun(this.deps.store, job, request);
  }

  async pause(actor: ImportActor, accountId: string, jobId: string) {
    const ws = this.workspace(actor, accountId);
    const job = await this.requireJob(ws, jobId);
    if (job.status === IMPORT_STATUS.PAUSED) {
      return toJobView(job);
    }
    if (job.status !== IMPORT_STATUS.PROCESSING) {
      throw HttpError.conflict(
        "Import can only be paused while processing",
        { status: job.status },
        IMPORT_ERROR_CODE.IMPORT_INVALID_STATE,
      );
    }
    const paused = await pauseImport(this.deps, ws, jobId);
    if (!paused) {
      throw notFound();
    }
    return toJobView(paused);
  }

  async resume(actor: ImportActor, accountId: string, jobId: string) {
    const ws = this.workspace(actor, accountId);
    const job = await this.requireJob(ws, jobId);
    if (job.status !== IMPORT_STATUS.PAUSED) {
      throw HttpError.conflict(
        "Import can only be resumed from paused",
        { status: job.status },
        IMPORT_ERROR_CODE.IMPORT_INVALID_STATE,
      );
    }
    const result = await resumeImport(this.deps, ws, jobId);
    if (!result.ok) {
      if (result.reason === "not_found") {
        throw notFound();
      }
      throw HttpError.conflict(
        "Import could not be resumed",
        { reason: result.reason },
        IMPORT_ERROR_CODE.IMPORT_INVALID_STATE,
      );
    }
    return toJobView(result.job);
  }

  async cancel(actor: ImportActor, accountId: string, jobId: string) {
    const ws = this.workspace(actor, accountId);
    const job = await this.requireJob(ws, jobId);
    if (job.status === IMPORT_STATUS.CANCELLED) {
      return toJobView(job);
    }
    if (COMPLETED_STATUSES.has(job.status) || job.status === IMPORT_STATUS.FAILED) {
      throw HttpError.conflict(
        "Import is already finished",
        { status: job.status },
        IMPORT_ERROR_CODE.IMPORT_INVALID_STATE,
      );
    }
    const result = await cancelImport(this.deps, ws, jobId);
    if (!result.ok) {
      if (result.reason === "not_found") {
        throw notFound();
      }
      throw HttpError.conflict(
        "Import could not be cancelled",
        { reason: result.reason },
        IMPORT_ERROR_CODE.IMPORT_INVALID_STATE,
      );
    }
    return toJobView(result.job);
  }

  async getStatus(actor: ImportActor, accountId: string, jobId: string) {
    const job = await this.requireJob(this.workspace(actor, accountId), jobId);
    return toJobView(job);
  }

  async list(actor: ImportActor, accountId: string, query: unknown) {
    const parsed = ListImportsQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw HttpError.badRequest("Invalid list query", parsed.error.flatten());
    }
    let status: ImportStatus | undefined;
    if (parsed.data.status) {
      const statusParsed = ImportStatusSchema.safeParse(parsed.data.status);
      if (!statusParsed.success) {
        throw HttpError.badRequest("Invalid import status filter");
      }
      status = statusParsed.data;
    }
    const page = await this.deps.repository.listAccountJobs(this.workspace(actor, accountId), {
      status,
      cursor: parsed.data.cursor,
      limit: parsed.data.limit,
    });
    return {
      docs: page.jobs.map(toJobView),
      nextCursor: page.nextCursor,
    };
  }

  async errorDownload(actor: ImportActor, accountId: string, jobId: string) {
    const job = await this.requireJob(this.workspace(actor, accountId), jobId);
    if (!COMPLETED_STATUSES.has(job.status) || !job.errorReportKey) {
      throw HttpError.conflict(
        "Error report is not available yet",
        { status: job.status },
        IMPORT_ERROR_CODE.IMPORT_INVALID_STATE,
      );
    }
    const key = job.errorReportKey ?? errorReportKey(job.id);
    if (!(await this.deps.store.exists(key))) {
      throw HttpError.conflict(
        "Error report is not available yet",
        { status: job.status },
        IMPORT_ERROR_CODE.IMPORT_INVALID_STATE,
      );
    }
    const url = await this.deps.presigner.createDownloadGet(
      key,
      `import-${job.id}-errors.csv`,
      IMPORT_ERROR_DOWNLOAD_EXPIRES_SEC,
    );
    return { url, expiresInSec: IMPORT_ERROR_DOWNLOAD_EXPIRES_SEC };
  }

  async openErrorReport(actor: ImportActor, accountId: string, jobId: string) {
    const job = await this.requireJob(this.workspace(actor, accountId), jobId);
    if (!COMPLETED_STATUSES.has(job.status) || !job.errorReportKey) {
      throw HttpError.conflict(
        "Error report is not available yet",
        { status: job.status },
        IMPORT_ERROR_CODE.IMPORT_INVALID_STATE,
      );
    }
    const key = job.errorReportKey ?? errorReportKey(job.id);
    if (!(await this.deps.store.exists(key))) {
      throw HttpError.conflict(
        "Error report is not available yet",
        { status: job.status },
        IMPORT_ERROR_CODE.IMPORT_INVALID_STATE,
      );
    }
    return {
      stream: await this.deps.store.createReadStream(key),
      fileName: `import-${job.id}-errors.csv`,
    };
  }

  private async requireJob(
    workspaceId: ImportWorkspaceId,
    jobId: string,
  ): Promise<ContactImportJobRecord> {
    const job = await this.deps.repository.getJob(workspaceId, jobId);
    if (!job) {
      throw notFound();
    }
    return job;
  }

  private async assertCreateLimits(workspaceId: ImportWorkspaceId): Promise<void> {
    const [active, created] = await Promise.all([
      this.deps.repository.countNonTerminalJobs(workspaceId),
      this.deps.repository.countJobsCreatedSince(
        workspaceId,
        new Date(Date.now() - 60 * 60 * 1000),
      ),
    ]);
    if (active >= maxActiveImportsPerAccount()) {
      throw HttpError.tooManyRequests(
        "Too many active imports for this account",
        { active, max: maxActiveImportsPerAccount() },
        IMPORT_ERROR_CODE.IMPORT_QUOTA_ACTIVE,
      );
    }
    if (created >= maxImportCreatesPerHour()) {
      throw HttpError.tooManyRequests(
        "Too many import jobs created in the last hour",
        { created, max: maxImportCreatesPerHour() },
        IMPORT_ERROR_CODE.IMPORT_RATE_LIMITED,
      );
    }
  }

  private async assertUploadedObject(job: ContactImportJobRecord): Promise<void> {
    if (!(await this.deps.store.exists(job.file.key))) {
      throw HttpError.badRequest(
        "Uploaded object was not found",
        undefined,
        IMPORT_ERROR_CODE.IMPORT_EMPTY,
      );
    }
    const size = await this.deps.store.size(job.file.key);
    if (size > IMPORT_MAX_FILE_BYTES) {
      throw HttpError.badRequest(
        "Uploaded object exceeds the size cap",
        { size },
        IMPORT_ERROR_CODE.IMPORT_FILE_TOO_LARGE,
      );
    }
    if (size !== job.file.byteSize) {
      throw HttpError.badRequest(
        "Uploaded object size does not match the declared size",
        { size, declared: job.file.byteSize },
        IMPORT_ERROR_CODE.IMPORT_SIZE_MISMATCH,
      );
    }
    const probe = await readPrefix(this.deps.store, job.file.key, IMPORT_PROBE_BYTES);
    try {
      assertImportMagic(probe);
    } catch (error) {
      if (error instanceof PermanentError) {
        throw HttpError.badRequest(error.message, undefined, error.code);
      }
      throw error;
    }
  }

  private async assertDryRunLimit(
    workspaceId: ImportWorkspaceId,
    job: ContactImportJobRecord,
  ): Promise<void> {
    const max = maxDryRunsPerHour();
    const now = Date.now();
    const windowStartedAt = job.dryRun?.windowStartedAt;
    const inWindow =
      windowStartedAt !== undefined && now - windowStartedAt.getTime() < 60 * 60 * 1000;
    const count = inWindow ? (job.dryRun?.count ?? 0) : 0;
    if (count >= max) {
      throw HttpError.tooManyRequests(
        "Too many dry-runs for this import in the last hour",
        { count, max },
        IMPORT_ERROR_CODE.IMPORT_RATE_LIMITED,
      );
    }
    const patched = await this.deps.repository.patchJob(workspaceId, job.id, {
      dryRun: {
        windowStartedAt: inWindow && windowStartedAt ? windowStartedAt : new Date(),
        count: count + 1,
      },
    });
    if (!patched) {
      throw notFound();
    }
  }
}

export function toJobView(job: ContactImportJobRecord) {
  const total = job.totalRows || job.counters.totalRows;
  const processed = job.counters.processed;
  const percent = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;
  return {
    id: job.id,
    status: job.status,
    file: {
      fileName: job.file.fileName,
      mimeType: job.file.mimeType,
      byteSize: job.file.byteSize,
      key: job.file.key,
    },
    processed,
    total,
    percent,
    totals: job.counters,
    rowErrorPreview: job.rowErrorPreview,
    timestamps: {
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    },
    errorReportAvailable: Boolean(job.errorReportKey) && COMPLETED_STATUSES.has(job.status),
    defaultCountry: job.defaultCountry,
    consentAttested: job.consentAttestation?.confirmed === true,
  };
}

function parseCreateBody(input: unknown): CreateImportBody {
  const parsed = CreateImportBodySchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }
  const tooBig = parsed.error.issues.some(
    (issue) => issue.path.includes("fileSize") && issue.code === "too_big",
  );
  throw HttpError.badRequest(
    tooBig ? `File exceeds ${IMPORT_MAX_FILE_BYTES} bytes` : "Invalid import create payload",
    parsed.error.flatten(),
    tooBig ? IMPORT_ERROR_CODE.IMPORT_FILE_TOO_LARGE : undefined,
  );
}

function fileExtension(fileName: string): "csv" | "xlsx" {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".xlsx")) {
    return "xlsx";
  }
  if (lower.endsWith(".csv")) {
    return "csv";
  }
  throw HttpError.badRequest(
    "Only .csv and .xlsx files are supported",
    undefined,
    IMPORT_ERROR_CODE.IMPORT_UNSUPPORTED_TYPE,
  );
}

function assertStartMapping(
  headers: string[],
  start: Pick<StartImportRequest, "mapping" | "identity">,
): void {
  const headerSet = new Set(headers);
  for (const field of start.mapping) {
    if (!headerSet.has(field.source)) {
      throw HttpError.badRequest(
        `Mapped column "${field.source}" is not in the file headers`,
        { source: field.source },
      );
    }
  }
  const targets = new Set(
    start.mapping
      .filter((field) => field.target !== IMPORT_FIELD_TARGET.IGNORE)
      .map((field) => field.target),
  );
  if (!targets.has(IMPORT_FIELD_TARGET.PHONE) && !targets.has(IMPORT_FIELD_TARGET.EMAIL)) {
    throw HttpError.badRequest("Map at least one identity column (phone or email)");
  }
  const keys = start.identity?.keys ?? ["phone", "email"];
  if (!keys.some((key) => targets.has(key))) {
    throw HttpError.badRequest("At least one configured identity key must be mapped");
  }
}

async function readPrefix(
  store: ImportOrchestrationDeps["store"],
  key: string,
  bytes: number,
): Promise<Buffer> {
  const stream = await store.createReadStream(key, { start: 0, end: bytes - 1 });
  const parts: Buffer[] = [];
  for await (const chunk of stream) {
    parts.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(parts);
}

function notFound(): HttpError {
  return HttpError.notFound("Import job not found", undefined, IMPORT_ERROR_CODE.IMPORT_NOT_FOUND);
}
