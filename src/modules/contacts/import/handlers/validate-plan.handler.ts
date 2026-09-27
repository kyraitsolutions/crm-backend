import { z } from "zod";
import { IMPORT_ERROR_CODE, IMPORT_STATUS } from "../constants/import.constant.js";
import { isPermanentError, PermanentError, TransientError } from "../errors/import-worker.errors.js";
import { planChunks } from "../parser/chunker.js";
import { inspectFile } from "../parser/inspect-file.js";
import type { QueueJob } from "../queue/queue-port.js";
import type { ImportOrchestrationDeps } from "../runtime/deps.js";
import type { ContactImportJobRecord, ImportWorkspaceId } from "../types/import.types.js";

const JobDataSchema = z.object({
  jobId: z.string().min(1),
  organizationId: z.string().min(1),
  accountId: z.string().min(1),
});

const PLANNED_STATUSES = new Set<string>([
  IMPORT_STATUS.MAPPING,
  IMPORT_STATUS.QUEUED,
  IMPORT_STATUS.PROCESSING,
  IMPORT_STATUS.PAUSED,
  IMPORT_STATUS.COMPLETED,
  IMPORT_STATUS.COMPLETED_WITH_ERRORS,
  IMPORT_STATUS.CANCELLED,
]);

export async function handleValidatePlan(
  deps: ImportOrchestrationDeps,
  workspaceId: ImportWorkspaceId,
  jobId: string,
): Promise<void> {
  let job = await deps.repository.getJob(workspaceId, jobId);
  if (!job) {
    return;
  }
  if (job.status === IMPORT_STATUS.FAILED) {
    return;
  }
  if (PLANNED_STATUSES.has(job.status)) {
    return;
  }
  if (job.status === IMPORT_STATUS.UPLOADED || job.status === IMPORT_STATUS.SCANNING) {
    const from = job.status;
    const moved = await deps.repository.transition(
      workspaceId,
      jobId,
      from,
      IMPORT_STATUS.VALIDATING,
    );
    if (!moved.ok) {
      job = await deps.repository.getJob(workspaceId, jobId);
      if (!job || job.status !== IMPORT_STATUS.VALIDATING) {
        return;
      }
    } else {
      job = moved.job;
    }
  }
  if (job.status !== IMPORT_STATUS.VALIDATING) {
    return;
  }

  try {
    await planAndPersist(deps, workspaceId, job);
  } catch (error) {
    if (isPermanentError(error)) {
      await deps.repository.transition(
        workspaceId,
        jobId,
        IMPORT_STATUS.VALIDATING,
        IMPORT_STATUS.FAILED,
        { errorMessage: `${error.code}: ${error.message}` },
      );
      return;
    }
    throw error instanceof TransientError
      ? error
      : new TransientError(
          error instanceof Error ? error.message : "Validate/plan failed",
          "IMPORT_VALIDATE_TRANSIENT",
        );
  }
}

export async function handleValidatePlanJob(
  deps: ImportOrchestrationDeps,
  job: QueueJob,
): Promise<void> {
  const data = JobDataSchema.parse(job.data);
  await handleValidatePlan(
    { ...deps, onHeartbeat: job.heartbeat ?? deps.onHeartbeat },
    { organizationId: data.organizationId, accountId: data.accountId },
    data.jobId,
  );
}

async function planAndPersist(
  deps: ImportOrchestrationDeps,
  workspaceId: ImportWorkspaceId,
  job: ContactImportJobRecord,
): Promise<void> {
  const inspected = await inspectFile(deps.store, job.file.key, {
    tempDir: deps.settings.xlsxTempDir,
    maxFileBytes: deps.settings.xlsxTempMaxBytes,
    onHeartbeat: deps.onHeartbeat,
  });
  const descriptors = await planChunks(deps.store, inspected.sourceKey, {
    delimiter: inspected.delimiter,
    rowsPerChunk: deps.settings.rowsPerChunk,
    maxChunkBytes: deps.settings.maxChunkBytes,
  });
  await deps.repository.insertChunks(workspaceId, job.id, descriptors);
  const last = descriptors[descriptors.length - 1];
  const totalRows = last === undefined ? 0 : last.endRow;
  const mapped = await deps.repository.transition(
    workspaceId,
    job.id,
    IMPORT_STATUS.VALIDATING,
    IMPORT_STATUS.MAPPING,
    {
      headers: inspected.headers,
      sampleRows: inspected.sampleRows,
      totalRows,
      totalChunks: descriptors.length,
      file: {
        ...job.file,
        detected: {
          kind: inspected.kind,
          encoding: inspected.encoding,
          delimiter: inspected.delimiter,
          hasBom: inspected.hasBom,
          sheetNames: inspected.sheetNames,
          sheetName: inspected.sheetName,
          date1904: inspected.date1904,
        },
      },
    },
  );
  if (!mapped.ok && mapped.reason === "not_found") {
    throw new PermanentError("Import job not found", IMPORT_ERROR_CODE.IMPORT_NOT_FOUND);
  }
}
