import { IMPORT_CHUNK_STATUS, IMPORT_STATUS } from "../constants/import.constant.js";
import { dispatchForJob, promoteIfSlotFree } from "../dispatch/dispatch-executor.js";
import { chunkJobId } from "../queue/queue-port.js";
import { IMPORT_JOB_NAME } from "../queue/queue-port.js";
import type { ImportOrchestrationDeps } from "../runtime/deps.js";
import { applyTerminalEffects } from "../runtime/terminal-effects.js";
import type { ImportWorkspaceId } from "../types/import.types.js";

const SWEEP_LIMIT = 200;

export async function handleSweep(deps: ImportOrchestrationDeps, now = new Date()): Promise<void> {
  await reconcileUnappliedTotals(deps);
  await promoteQueued(deps);
  await refillInFlight(deps);
  await resetExpiredLeases(deps, now);
  await enqueueReadyFinalizes(deps);
  await failStalled(deps, now);
}

async function reconcileUnappliedTotals(deps: ImportOrchestrationDeps): Promise<void> {
  const chunks = await deps.repository.listUnappliedDoneChunks(SWEEP_LIMIT);
  for (const chunk of chunks) {
    const workspace: ImportWorkspaceId = {
      organizationId: chunk.organizationId,
      accountId: chunk.accountId,
    };
    await deps.repository.reapplyChunkTotals(workspace, chunk.jobId, {
      index: chunk.index,
      startRow: chunk.startRow,
      endRow: chunk.endRow,
      byteOffsetStart: chunk.byteOffsetStart,
      byteOffsetEnd: chunk.byteOffsetEnd,
      inserted: chunk.inserted,
      updated: chunk.updated,
      skipped: chunk.skipped,
      failed: chunk.failed,
      duplicates: chunk.duplicates,
      leaseToken: chunk.leaseToken ?? "",
    });
  }
}

async function promoteQueued(deps: ImportOrchestrationDeps): Promise<void> {
  const queued = await deps.repository.listJobsByStatus(IMPORT_STATUS.QUEUED, SWEEP_LIMIT);
  for (const job of queued) {
    const workspace = workspaceOf(job);
    const promoted = await promoteIfSlotFree(deps, workspace, job.id);
    if (promoted) {
      await dispatchForJob(deps, workspace, job.id);
    }
  }
}

async function refillInFlight(deps: ImportOrchestrationDeps): Promise<void> {
  const processing = await deps.repository.listJobsByStatus(
    IMPORT_STATUS.PROCESSING,
    SWEEP_LIMIT,
  );
  for (const job of processing) {
    if (job.pauseRequested || job.cancelRequested) {
      continue;
    }
    await dispatchForJob(deps, workspaceOf(job), job.id);
  }
}

async function resetExpiredLeases(
  deps: ImportOrchestrationDeps,
  now: Date,
): Promise<void> {
  const expired = await deps.repository.listExpiredLeaseChunks(now, SWEEP_LIMIT);
  for (const chunk of expired) {
    const workspace: ImportWorkspaceId = {
      organizationId: chunk.organizationId,
      accountId: chunk.accountId,
    };
    const reset = await deps.repository.resetExpiredLease(
      workspace,
      chunk.jobId,
      chunk.index,
      now,
    );
    if (!reset) {
      continue;
    }
    const job = await deps.repository.getJob(workspace, chunk.jobId);
    if (!job || job.status !== IMPORT_STATUS.PROCESSING) {
      continue;
    }
    if (job.pauseRequested || job.cancelRequested) {
      continue;
    }
    await deps.queue.enqueue(
      IMPORT_JOB_NAME.CHUNK,
      {
        jobId: chunk.jobId,
        organizationId: chunk.organizationId,
        accountId: chunk.accountId,
        index: chunk.index,
      },
      { jobId: chunkJobId(chunk.jobId, chunk.index), attempts: deps.settings.chunkAttempts },
    );
  }
}

async function enqueueReadyFinalizes(deps: ImportOrchestrationDeps): Promise<void> {
  const processing = await deps.repository.listJobsByStatus(
    IMPORT_STATUS.PROCESSING,
    SWEEP_LIMIT,
  );
  for (const job of processing) {
    const workspace = workspaceOf(job);
    const counts = await deps.repository.countChunksByStatus(workspace, job.id);
    const pending = counts[IMPORT_CHUNK_STATUS.PENDING] ?? 0;
    const inFlight = counts[IMPORT_CHUNK_STATUS.PROCESSING] ?? 0;
    if (pending === 0 && inFlight === 0) {
      await dispatchForJob(deps, workspace, job.id);
    }
  }
}

async function failStalled(deps: ImportOrchestrationDeps, now: Date): Promise<void> {
  const processing = await deps.repository.listJobsByStatus(
    IMPORT_STATUS.PROCESSING,
    SWEEP_LIMIT,
  );
  for (const job of processing) {
    const workspace = workspaceOf(job);
    const chunks = await deps.repository.listChunks(workspace, job.id);
    const lastActivity = latestActivity(job.updatedAt, chunks);
    if (now.getTime() - lastActivity.getTime() < deps.settings.stallMaxMs) {
      continue;
    }
    await deps.repository.transition(
      workspace,
      job.id,
      IMPORT_STATUS.PROCESSING,
      IMPORT_STATUS.FAILED,
      { errorMessage: "IMPORT_STALLED: no progress within IMPORT_STALL_MAX" },
    );
    await applyTerminalEffects(deps, workspace, job.id);
  }
}

function latestActivity(
  jobUpdatedAt: Date,
  chunks: Array<{ lockedAt?: Date; completedAt?: Date }>,
): Date {
  let latest = jobUpdatedAt.getTime();
  for (const chunk of chunks) {
    if (chunk.lockedAt) {
      latest = Math.max(latest, chunk.lockedAt.getTime());
    }
    if (chunk.completedAt) {
      latest = Math.max(latest, chunk.completedAt.getTime());
    }
  }
  return new Date(latest);
}

function workspaceOf(job: { organizationId: string; accountId: string }): ImportWorkspaceId {
  return { organizationId: job.organizationId, accountId: job.accountId };
}
