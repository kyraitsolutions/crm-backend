import { BullImportQueue } from "../../queue/bull-queue.js";
import { parseRedisUrl } from "../integration-safety.js";

const queueName = process.env.IMPORT_QUEUE_NAME;
const prefix = process.env.IMPORT_BULL_PREFIX;
const redisUrl = process.env.REDIS_URL;
const jobName = process.env.IMPORT_STALL_JOB_NAME;

if (!queueName || !prefix || !redisUrl || !jobName) {
  throw new Error("stall-worker-child missing IMPORT_QUEUE_NAME / PREFIX / REDIS_URL / STALL_JOB_NAME");
}

const queue = new BullImportQueue({
  redis: parseRedisUrl(redisUrl),
  queueName,
  prefix,
  lockDurationMs: Number(process.env.IMPORT_LOCK_MS ?? 2000),
  stalledIntervalMs: Number(process.env.IMPORT_STALL_INTERVAL_MS ?? 1000),
  attempts: 2,
  backoffBaseMs: 50,
});

queue.process(jobName, 1, async () => {
  await new Promise((resolve) => {
    setTimeout(resolve, 120_000);
  });
});

process.stdout.write("READY\n");

const shutdown = async (): Promise<void> => {
  await queue.close().catch(() => undefined);
  process.exit(0);
};
process.on("SIGTERM", () => {
  void shutdown();
});
