import { emitToAccount } from "../../../../config/wsServer/wsEmitter.js";
import { ActivityLogService } from "../../../../services/activityLog.service.js";
import logger from "../../../../utils/logger.js";
import { IMPORT_STATUS } from "../constants/import.constant.js";
import type { ContactImportJobRecord, ImportWorkspaceId } from "../types/import.types.js";
import type { ImportOrchestrationDeps } from "./deps.js";

const activityLog = new ActivityLogService();

const COMPLETED = new Set<string>([
  IMPORT_STATUS.COMPLETED,
  IMPORT_STATUS.COMPLETED_WITH_ERRORS,
]);

const TERMINAL = new Set<string>([
  IMPORT_STATUS.COMPLETED,
  IMPORT_STATUS.COMPLETED_WITH_ERRORS,
  IMPORT_STATUS.FAILED,
  IMPORT_STATUS.CANCELLED,
]);

export async function applyTerminalEffects(
  deps: ImportOrchestrationDeps,
  workspaceId: ImportWorkspaceId,
  jobId: string,
): Promise<void> {
  const job = await deps.repository.getJob(workspaceId, jobId);
  if (!job || !TERMINAL.has(job.status)) {
    return;
  }
  await settleOrReleaseQuota(deps, job);
  if (COMPLETED.has(job.status)) {
    await notifyImportCompleted(job);
  }
}

async function settleOrReleaseQuota(
  deps: ImportOrchestrationDeps,
  job: ContactImportJobRecord,
): Promise<void> {
  const inserted = job.counters.inserted;
  const next = inserted > 0 ? "settled" : "released";
  const claimed = await deps.repository.claimQuotaSettlement(
    { organizationId: job.organizationId, accountId: job.accountId },
    job.id,
    next,
    inserted,
    job.quota?.reservedRows ?? job.totalRows,
  );
  if (!claimed || next !== "settled" || !deps.quota) {
    return;
  }
  try {
    await deps.quota.settleInserted(job.organizationId, job, inserted);
  } catch (error) {
    logger.error("CONTACT_IMPORT quota settlement failed", {
      jobId: job.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function notifyImportCompleted(job: ContactImportJobRecord): Promise<void> {
  try {
    await activityLog.create({
      organizationId: job.organizationId,
      accountId: job.accountId,
      entityType: "contact_import",
      entityId: job.id,
      action: "contact_import.completed",
      actor: { type: "system", name: "contact-import" },
      metadata: {
        status: job.status,
        inserted: job.counters.inserted,
        updated: job.counters.updated,
        skipped: job.counters.skipped,
        failed: job.counters.failed,
        duplicates: job.counters.duplicates,
      },
    });
  } catch (error) {
    logger.error("CONTACT_IMPORT activity log failed", {
      jobId: job.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  try {
    emitToAccount(job.accountId, "import.completed", {
      jobId: job.id,
      status: job.status,
      counters: job.counters,
    });
  } catch (error) {
    logger.error("CONTACT_IMPORT import.completed emit failed", {
      jobId: job.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
