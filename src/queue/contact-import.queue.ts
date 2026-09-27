import { BullImportQueue } from "../modules/contacts/import/queue/bull-queue.js";
import {
  CLEANUP_REPEAT_JOB_ID,
  IMPORT_JOB_NAME,
  SWEEP_REPEAT_JOB_ID,
} from "../modules/contacts/import/queue/queue-port.js";

export async function scheduleImportRepeatables(
  queue: BullImportQueue,
  sweepIntervalMs: number,
): Promise<void> {
  await queue.addRepeatable(
    IMPORT_JOB_NAME.SWEEP,
    {},
    { jobId: SWEEP_REPEAT_JOB_ID, everyMs: sweepIntervalMs },
  );
  await queue.addRepeatable(
    IMPORT_JOB_NAME.CLEANUP,
    {},
    { jobId: CLEANUP_REPEAT_JOB_ID, cron: "0 3 * * *" },
  );
}

export { BullImportQueue };
