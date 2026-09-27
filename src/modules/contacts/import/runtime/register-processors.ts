import { handleChunkJob } from "../handlers/chunk.handler.js";
import { handleCleanup } from "../handlers/cleanup.handler.js";
import { handleFinalizeJob } from "../handlers/finalize.handler.js";
import { handleSweep } from "../handlers/sweeper.handler.js";
import { handleValidatePlanJob } from "../handlers/validate-plan.handler.js";
import { IMPORT_JOB_NAME } from "../queue/queue-port.js";
import type { ImportOrchestrationDeps } from "./deps.js";

export function registerImportProcessors(
  deps: ImportOrchestrationDeps,
  concurrency: number,
): void {
  deps.queue.process(IMPORT_JOB_NAME.VALIDATE, 1, (job) => handleValidatePlanJob(deps, job));
  deps.queue.process(IMPORT_JOB_NAME.CHUNK, concurrency, (job) => handleChunkJob(deps, job));
  deps.queue.process(IMPORT_JOB_NAME.FINALIZE, 1, (job) => handleFinalizeJob(deps, job));
  deps.queue.process(IMPORT_JOB_NAME.SWEEP, 1, async () => {
    await handleSweep(deps);
  });
  deps.queue.process(IMPORT_JOB_NAME.CLEANUP, 1, async () => {
    await handleCleanup(deps);
  });
}
