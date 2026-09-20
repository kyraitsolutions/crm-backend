import { IMPORT_STATUS } from "../constants/import.constant.js";
import { dispatchForJob, promoteIfSlotFree, settleLifecycle } from "../dispatch/dispatch-executor.js";
import type { ImportOrchestrationDeps } from "../runtime/deps.js";
import type {
  ContactImportJobRecord,
  ImportWorkspaceId,
  StartImportRequest,
  TransitionResult,
} from "../types/import.types.js";
import { persistStartConfig } from "../worker/persist-start.js";
import { applyTerminalEffects } from "../runtime/terminal-effects.js";

export async function startImport(
  deps: ImportOrchestrationDeps,
  workspaceId: ImportWorkspaceId,
  jobId: string,
  start: StartImportRequest,
): Promise<TransitionResult<ContactImportJobRecord>> {
  const current = await deps.repository.getJob(workspaceId, jobId);
  if (!current) {
    return { ok: false, reason: "not_found" };
  }
  if (current.status === IMPORT_STATUS.MAPPING) {
    const queued = await persistStartConfig(deps.repository, workspaceId, jobId, start);
    if (!queued.ok) {
      return queued;
    }
  }
  const afterQueue = await deps.repository.getJob(workspaceId, jobId);
  if (!afterQueue) {
    return { ok: false, reason: "not_found" };
  }
  if (afterQueue.status === IMPORT_STATUS.QUEUED) {
    const promoted = await promoteIfSlotFree(deps, workspaceId, jobId);
    if (promoted) {
      await dispatchForJob(deps, workspaceId, jobId);
    }
  } else if (afterQueue.status === IMPORT_STATUS.PROCESSING) {
    await dispatchForJob(deps, workspaceId, jobId);
  }
  const latest = await deps.repository.getJob(workspaceId, jobId);
  if (!latest) {
    return { ok: false, reason: "not_found" };
  }
  return { ok: true, job: latest };
}

export async function pauseImport(
  deps: ImportOrchestrationDeps,
  workspaceId: ImportWorkspaceId,
  jobId: string,
): Promise<ContactImportJobRecord | null> {
  const patched = await deps.repository.patchJob(workspaceId, jobId, {
    pauseRequested: true,
  });
  if (!patched) {
    return null;
  }
  await settleLifecycle(deps, workspaceId, jobId);
  return deps.repository.getJob(workspaceId, jobId);
}

export async function resumeImport(
  deps: ImportOrchestrationDeps,
  workspaceId: ImportWorkspaceId,
  jobId: string,
): Promise<TransitionResult<ContactImportJobRecord>> {
  const patched = await deps.repository.patchJob(workspaceId, jobId, {
    pauseRequested: false,
  });
  if (!patched) {
    return { ok: false, reason: "not_found" };
  }
  if (patched.status === IMPORT_STATUS.PAUSED) {
    const resumed = await deps.repository.transition(
      workspaceId,
      jobId,
      IMPORT_STATUS.PAUSED,
      IMPORT_STATUS.PROCESSING,
    );
    if (!resumed.ok) {
      return resumed;
    }
  }
  await dispatchForJob(deps, workspaceId, jobId);
  const latest = await deps.repository.getJob(workspaceId, jobId);
  if (!latest) {
    return { ok: false, reason: "not_found" };
  }
  return { ok: true, job: latest };
}

export async function cancelImport(
  deps: ImportOrchestrationDeps,
  workspaceId: ImportWorkspaceId,
  jobId: string,
): Promise<TransitionResult<ContactImportJobRecord>> {
  const patched = await deps.repository.patchJob(workspaceId, jobId, {
    cancelRequested: true,
  });
  if (!patched) {
    return { ok: false, reason: "not_found" };
  }
  const immediateCancelFrom = new Set<string>([
    IMPORT_STATUS.UPLOADED,
    IMPORT_STATUS.SCANNING,
    IMPORT_STATUS.VALIDATING,
    IMPORT_STATUS.MAPPING,
    IMPORT_STATUS.QUEUED,
    IMPORT_STATUS.PAUSED,
  ]);
  if (immediateCancelFrom.has(patched.status)) {
    const cancelled = await deps.repository.transition(
      workspaceId,
      jobId,
      patched.status,
      IMPORT_STATUS.CANCELLED,
    );
    if (cancelled.ok) {
      await applyTerminalEffects(deps, workspaceId, jobId);
    }
    return cancelled;
  }
  if (patched.status === IMPORT_STATUS.PROCESSING) {
    await settleLifecycle(deps, workspaceId, jobId);
  }
  const latest = await deps.repository.getJob(workspaceId, jobId);
  if (!latest) {
    return { ok: false, reason: "not_found" };
  }
  if (latest.status === IMPORT_STATUS.CANCELLED) {
    await applyTerminalEffects(deps, workspaceId, jobId);
    return { ok: true, job: latest };
  }
  return { ok: true, job: latest };
}
