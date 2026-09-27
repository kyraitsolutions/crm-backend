import { z } from "zod";
import { IMPORT_STATUS } from "../constants/import.constant.js";
import { dispatchForJob } from "../dispatch/dispatch-executor.js";
import {
  isPermanentError,
  isTransientError,
  TransientError,
} from "../errors/import-worker.errors.js";
import type { QueueJob } from "../queue/queue-port.js";
import type { ImportOrchestrationDeps } from "../runtime/deps.js";
import type { ImportWorkspaceId } from "../types/import.types.js";
import { processChunk } from "../worker/process-chunk.js";

const ChunkDataSchema = z.object({
  jobId: z.string().min(1),
  organizationId: z.string().min(1),
  accountId: z.string().min(1),
  index: z.number().int().nonnegative(),
});

export async function handleChunkJob(
  deps: ImportOrchestrationDeps,
  job: QueueJob,
): Promise<void> {
  const data = ChunkDataSchema.parse(job.data);
  const workspaceId: ImportWorkspaceId = {
    organizationId: data.organizationId,
    accountId: data.accountId,
  };
  await handleChunk(deps, workspaceId, data.jobId, data.index);
}

export async function handleChunk(
  deps: ImportOrchestrationDeps,
  workspaceId: ImportWorkspaceId,
  jobId: string,
  index: number,
): Promise<void> {
  const job = await deps.repository.getJob(workspaceId, jobId);
  if (!job) {
    return;
  }
  if (
    job.status === IMPORT_STATUS.PAUSED ||
    job.status === IMPORT_STATUS.CANCELLED ||
    job.status === IMPORT_STATUS.FAILED ||
    job.status === IMPORT_STATUS.COMPLETED ||
    job.status === IMPORT_STATUS.COMPLETED_WITH_ERRORS
  ) {
    return;
  }
  if (job.pauseRequested || job.cancelRequested) {
    await dispatchForJob(deps, workspaceId, jobId);
    return;
  }

  const existing = await deps.repository.getChunk(workspaceId, jobId, index);
  if (!existing) {
    return;
  }
  const descriptor = {
    index: existing.index,
    startRow: existing.startRow,
    endRow: existing.endRow,
    byteOffsetStart: existing.byteOffsetStart,
    byteOffsetEnd: existing.byteOffsetEnd,
  };

  const claim = await deps.repository.claimChunk(workspaceId, jobId, descriptor, {
    leaseMs: deps.settings.leaseMs,
  });
  if (!claim.ok) {
    return;
  }
  if (claim.alreadyDone) {
    await dispatchForJob(deps, workspaceId, jobId);
    return;
  }

  try {
    await processChunk(
      {
        workspaceId,
        jobId,
        repository: deps.repository,
        store: deps.store,
        leaseMs: deps.settings.leaseMs,
        leaseToken: claim.leaseToken,
        heartbeatMs: deps.settings.heartbeatMs,
      },
      descriptor,
    );
  } catch (error) {
    if (isTransientError(error)) {
      await deps.repository.releaseChunk(
        workspaceId,
        jobId,
        index,
        claim.leaseToken,
        error.message,
      );
      throw error;
    }
    if (isPermanentError(error)) {
      await deps.repository.markChunkFailed(
        workspaceId,
        jobId,
        index,
        claim.leaseToken,
        `${error.code}: ${error.message}`,
      );
      await dispatchForJob(deps, workspaceId, jobId);
      return;
    }
    await deps.repository.releaseChunk(
      workspaceId,
      jobId,
      index,
      claim.leaseToken,
      error instanceof Error ? error.message : "chunk failed",
    );
    throw new TransientError(
      error instanceof Error ? error.message : "Chunk handler failed",
      "IMPORT_CHUNK_TRANSIENT",
    );
  }

  await dispatchForJob(deps, workspaceId, jobId);
}
