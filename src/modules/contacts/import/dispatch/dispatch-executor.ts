import { IMPORT_CHUNK_STATUS, IMPORT_STATUS } from "../constants/import.constant.js";
import {
  chunkJobId,
  finalizeJobId,
  IMPORT_JOB_NAME,
} from "../queue/queue-port.js";
import type { ImportOrchestrationDeps } from "../runtime/deps.js";
import { applyTerminalEffects } from "../runtime/terminal-effects.js";
import type { ContactImportJobRecord, ImportWorkspaceId } from "../types/import.types.js";
import {
  computeDispatchActions,
  type DispatchAction,
} from "./compute-dispatch-actions.js";

export async function dispatchForJob(
  deps: ImportOrchestrationDeps,
  workspaceId: ImportWorkspaceId,
  jobId: string,
): Promise<void> {
  const job = await deps.repository.getJob(workspaceId, jobId);
  if (!job) {
    return;
  }
  const chunks = await deps.repository.listChunks(workspaceId, jobId);
  const pendingIndexes = chunks
    .filter((chunk) => chunk.status === IMPORT_CHUNK_STATUS.PENDING)
    .map((chunk) => chunk.index);
  const processingCount = chunks.filter(
    (chunk) => chunk.status === IMPORT_CHUNK_STATUS.PROCESSING,
  ).length;
  const actions = computeDispatchActions({
    jobStatus: job.status,
    cancelRequested: job.cancelRequested,
    pauseRequested: job.pauseRequested,
    pendingIndexes,
    processingCount,
    dispatchK: deps.settings.dispatchK,
  });
  await executeDispatchActions(deps, job, actions);
  await settleLifecycle(deps, workspaceId, jobId);
}

export async function executeDispatchActions(
  deps: ImportOrchestrationDeps,
  job: ContactImportJobRecord,
  actions: DispatchAction[],
): Promise<void> {
  for (const action of actions) {
    if (action.type === "enqueue_chunk") {
      await deps.queue.enqueue(
        IMPORT_JOB_NAME.CHUNK,
        {
          jobId: job.id,
          organizationId: job.organizationId,
          accountId: job.accountId,
          index: action.index,
        },
        { jobId: chunkJobId(job.id, action.index), attempts: deps.settings.chunkAttempts },
      );
    }
    if (action.type === "enqueue_finalize") {
      await deps.queue.enqueue(
        IMPORT_JOB_NAME.FINALIZE,
        {
          jobId: job.id,
          organizationId: job.organizationId,
          accountId: job.accountId,
        },
        { jobId: finalizeJobId(job.id) },
      );
    }
  }
}

export async function settleLifecycle(
  deps: ImportOrchestrationDeps,
  workspaceId: ImportWorkspaceId,
  jobId: string,
): Promise<void> {
  const job = await deps.repository.getJob(workspaceId, jobId);
  if (!job || job.status !== IMPORT_STATUS.PROCESSING) {
    return;
  }
  const counts = await deps.repository.countChunksByStatus(workspaceId, jobId);
  const inFlight = counts[IMPORT_CHUNK_STATUS.PROCESSING] ?? 0;
  if (inFlight > 0) {
    return;
  }
  if (job.cancelRequested) {
    await deps.repository.transition(
      workspaceId,
      jobId,
      IMPORT_STATUS.PROCESSING,
      IMPORT_STATUS.CANCELLED,
    );
    await applyTerminalEffects(deps, workspaceId, jobId);
    return;
  }
  if (job.pauseRequested) {
    await deps.repository.transition(
      workspaceId,
      jobId,
      IMPORT_STATUS.PROCESSING,
      IMPORT_STATUS.PAUSED,
    );
  }
}

export async function promoteIfSlotFree(
  deps: ImportOrchestrationDeps,
  workspaceId: ImportWorkspaceId,
  jobId: string,
): Promise<boolean> {
  const job = await deps.repository.getJob(workspaceId, jobId);
  if (!job || job.status !== IMPORT_STATUS.QUEUED) {
    return false;
  }
  const active = await deps.repository.countOrgJobsByStatus(
    job.organizationId,
    IMPORT_STATUS.PROCESSING,
  );
  if (active >= deps.settings.orgActiveSlots) {
    return false;
  }
  const result = await deps.repository.transition(
    workspaceId,
    jobId,
    IMPORT_STATUS.QUEUED,
    IMPORT_STATUS.PROCESSING,
  );
  return result.ok;
}
