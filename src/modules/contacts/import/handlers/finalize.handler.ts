import { Readable } from "node:stream";
import { z } from "zod";
import { IMPORT_CHUNK_STATUS, IMPORT_STATUS } from "../constants/import.constant.js";
import { csvLine } from "../parser/csv-format.js";
import { errorPartKey } from "../pipeline/error-part.js";
import type { QueueJob } from "../queue/queue-port.js";
import type { ImportOrchestrationDeps } from "../runtime/deps.js";
import { applyTerminalEffects } from "../runtime/terminal-effects.js";
import { errorReportKey } from "../store/file-keys.js";
import type {
  ContactImportChunkRecord,
  ContactImportJobRecord,
  ImportProgressCounters,
  ImportWorkspaceId,
} from "../types/import.types.js";

const JobDataSchema = z.object({
  jobId: z.string().min(1),
  organizationId: z.string().min(1),
  accountId: z.string().min(1),
});

const ERROR_HEADER = csvLine(["rowNumber", "reason", "column", "rawValue", "raw"]);

export async function handleFinalizeJob(
  deps: ImportOrchestrationDeps,
  job: QueueJob,
): Promise<void> {
  const data = JobDataSchema.parse(job.data);
  await handleFinalize(deps, {
    organizationId: data.organizationId,
    accountId: data.accountId,
  }, data.jobId);
}

export async function handleFinalize(
  deps: ImportOrchestrationDeps,
  workspaceId: ImportWorkspaceId,
  jobId: string,
): Promise<void> {
  const job = await deps.repository.getJob(workspaceId, jobId);
  if (!job) {
    return;
  }
  if (
    job.status === IMPORT_STATUS.COMPLETED ||
    job.status === IMPORT_STATUS.COMPLETED_WITH_ERRORS ||
    job.status === IMPORT_STATUS.FAILED
  ) {
    await applyTerminalEffects(deps, workspaceId, jobId);
    return;
  }
  if (job.status === IMPORT_STATUS.CANCELLED || job.cancelRequested) {
    return;
  }
  if (job.status !== IMPORT_STATUS.PROCESSING) {
    return;
  }

  const chunks = await deps.repository.listChunks(workspaceId, jobId);
  const open = chunks.some(
    (chunk) =>
      chunk.status === IMPORT_CHUNK_STATUS.PENDING ||
      chunk.status === IMPORT_CHUNK_STATUS.PROCESSING,
  );
  if (open) {
    return;
  }

  const totals = sumChunkTotals(chunks);
  const failedRows = chunks.reduce((sum, chunk) => sum + chunk.failed, 0);
  let reportKey: string | undefined;
  if (failedRows > 0) {
    reportKey = await mergeErrorReport(deps, jobId, chunks);
  }

  const hasErrors =
    failedRows > 0 || chunks.some((chunk) => chunk.status === IMPORT_CHUNK_STATUS.FAILED);
  const to = hasErrors ? IMPORT_STATUS.COMPLETED_WITH_ERRORS : IMPORT_STATUS.COMPLETED;
  await deps.repository.transition(workspaceId, jobId, IMPORT_STATUS.PROCESSING, to, {
    errorReportKey: reportKey,
    completedAt: new Date(),
  });
  await deps.repository.replaceJobTotals(workspaceId, jobId, {
    ...totals,
    totalRows: Math.max(job.totalRows, totals.processed, totals.totalRows),
  });
  await applyTerminalEffects(deps, workspaceId, jobId);
}

async function mergeErrorReport(
  deps: ImportOrchestrationDeps,
  jobId: string,
  chunks: ContactImportChunkRecord[],
): Promise<string> {
  const key = errorReportKey(jobId);
  const parts: Buffer[] = [Buffer.from(ERROR_HEADER)];
  for (const chunk of chunks) {
    const partKey = errorPartKey(jobId, chunk.index);
    if (!(await deps.store.exists(partKey))) {
      continue;
    }
    const body = await readPartWithoutHeader(deps, partKey);
    if (body.length === 0) {
      continue;
    }
    parts.push(body);
    if (!body.toString("utf8").endsWith("\n")) {
      parts.push(Buffer.from("\n"));
    }
  }
  await deps.store.putStream(key, Readable.from(parts));
  return key;
}

async function readPartWithoutHeader(
  deps: ImportOrchestrationDeps,
  key: string,
): Promise<Buffer> {
  const stream = await deps.store.createReadStream(key);
  const chunks: Buffer[] = [];
  for await (const piece of stream) {
    chunks.push(Buffer.isBuffer(piece) ? piece : Buffer.from(piece));
  }
  const text = Buffer.concat(chunks).toString("utf8");
  const lines = text.split(/\r?\n/).filter((line, index) => index > 0 && line.length > 0);
  if (lines.length === 0) {
    return Buffer.alloc(0);
  }
  return Buffer.from(`${lines.join("\n")}\n`);
}

function sumChunkTotals(chunks: ContactImportChunkRecord[]): ImportProgressCounters {
  return chunks.reduce(
    (acc, chunk) => ({
      totalRows: acc.totalRows,
      processed:
        acc.processed +
        chunk.inserted +
        chunk.updated +
        chunk.skipped +
        chunk.failed +
        chunk.duplicates,
      inserted: acc.inserted + chunk.inserted,
      updated: acc.updated + chunk.updated,
      skipped: acc.skipped + chunk.skipped,
      failed: acc.failed + chunk.failed,
      duplicates: acc.duplicates + chunk.duplicates,
    }),
    {
      totalRows: 0,
      processed: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      duplicates: 0,
    },
  );
}

export function finalizeHasErrors(job: ContactImportJobRecord, chunks: ContactImportChunkRecord[]): boolean {
  return (
    job.counters.failed > 0 ||
    chunks.some((chunk) => chunk.status === IMPORT_CHUNK_STATUS.FAILED || chunk.failed > 0)
  );
}
