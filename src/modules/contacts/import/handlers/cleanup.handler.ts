import { canonicalCsvKey } from "../parser/inspect-file.js";
import { errorPartKey } from "../pipeline/error-part.js";
import type { ImportOrchestrationDeps } from "../runtime/deps.js";
import { errorReportKey } from "../store/file-keys.js";
import type { ContactImportJobRecord, ImportWorkspaceId } from "../types/import.types.js";

const CLEANUP_LIMIT = 200;

export async function handleCleanup(
  deps: ImportOrchestrationDeps,
  now = new Date(),
): Promise<void> {
  await cleanupAbandonedUploads(deps, now);
  await cleanupTerminalArtifacts(deps, now);
}

async function cleanupAbandonedUploads(
  deps: ImportOrchestrationDeps,
  now: Date,
): Promise<void> {
  const cutoff = new Date(now.getTime() - deps.settings.abandonedUploadMs);
  const abandoned = await deps.repository.listAbandonedUploads(cutoff, CLEANUP_LIMIT);
  for (const job of abandoned) {
    const workspace = workspaceOf(job);
    await deleteQuietly(deps, job.file.key);
    await deps.repository.deleteChunksForJob(workspace, job.id);
    await deps.repository.deleteJob(workspace, job.id);
  }
}

async function cleanupTerminalArtifacts(
  deps: ImportOrchestrationDeps,
  now: Date,
): Promise<void> {
  const oldest = new Date(
    now.getTime() -
      Math.min(
        deps.settings.sourceTtlMs,
        deps.settings.errorReportTtlMs,
        deps.settings.chunkRetentionMs,
      ),
  );
  const jobs = await deps.repository.listTerminalJobs(oldest, CLEANUP_LIMIT);
  for (const job of jobs) {
    if (!isTerminal(job)) {
      continue;
    }
    const completedAt = job.completedAt ?? job.updatedAt;
    const age = now.getTime() - completedAt.getTime();
    const workspace = workspaceOf(job);
    if (age >= deps.settings.sourceTtlMs) {
      await deleteQuietly(deps, job.file.key);
      if (job.file.detected?.kind === "xlsx") {
        await deleteQuietly(deps, canonicalCsvKey(job.file.key));
      }
      for (let index = 0; index < job.totalChunks; index += 1) {
        await deleteQuietly(deps, errorPartKey(job.id, index));
      }
    }
    if (age >= deps.settings.errorReportTtlMs && job.errorReportKey) {
      await deleteQuietly(deps, job.errorReportKey);
      await deleteQuietly(deps, errorReportKey(job.id));
    }
    if (age >= deps.settings.chunkRetentionMs) {
      await deps.repository.deleteChunksForJob(workspace, job.id);
    }
  }
}

function isTerminal(job: ContactImportJobRecord): boolean {
  return (
    job.status === "completed" ||
    job.status === "completed_with_errors" ||
    job.status === "failed" ||
    job.status === "cancelled"
  );
}

async function deleteQuietly(deps: ImportOrchestrationDeps, key: string): Promise<void> {
  try {
    await deps.store.delete(key);
  } catch {
    return;
  }
}

function workspaceOf(job: { organizationId: string; accountId: string }): ImportWorkspaceId {
  return { organizationId: job.organizationId, accountId: job.accountId };
}
