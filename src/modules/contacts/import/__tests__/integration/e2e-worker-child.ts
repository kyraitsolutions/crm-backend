import mongoose from "mongoose";
import { defaultRuntimeSettings } from "../../config/import-env.js";
import { IMPORT_JOB_NAME, SWEEP_REPEAT_JOB_ID } from "../../queue/queue-port.js";
import { BullImportQueue } from "../../queue/bull-queue.js";
import { ContactImportRepository } from "../../repositories/contact-import.repository.js";
import { registerImportProcessors } from "../../runtime/register-processors.js";
import { PrefixedFileStore } from "../../store/prefixed-file-store.js";
import { S3FileStore } from "../../store/s3-file-store.js";
import { parseRedisUrl } from "../integration-safety.js";
import { createMinioClient } from "./helpers.js";

const databaseUrl = process.env.DATABASE_URL;
const redisUrl = process.env.REDIS_URL;
const queueName = process.env.IMPORT_QUEUE_NAME;
const prefix = process.env.IMPORT_BULL_PREFIX;
const s3Prefix = process.env.IMPORT_S3_KEY_PREFIX;
const bucket = process.env.AWS_S3_BUCKET ?? "contact-import-test";

if (!databaseUrl || !redisUrl || !queueName || !prefix || !s3Prefix) {
  throw new Error("e2e-worker-child missing required env");
}

const settings = defaultRuntimeSettings({
  rowsPerChunk: Number(process.env.IMPORT_CHUNK_ROWS ?? 2000),
  dispatchK: Number(process.env.IMPORT_DISPATCH_K ?? 3),
  heartbeatMs: Number(process.env.IMPORT_HEARTBEAT_MS ?? 2000),
  leaseMs: Number(process.env.IMPORT_LEASE_MS ?? 6000),
  stallMaxMs: Number(process.env.IMPORT_STALL_MAX_MS ?? 10 * 60 * 1000),
  chunkAttempts: 5,
  backoffBaseMs: 200,
});

const queue = new BullImportQueue({
  redis: parseRedisUrl(redisUrl),
  queueName,
  prefix,
  lockDurationMs: settings.leaseMs,
  stalledIntervalMs: 2_000,
  attempts: settings.chunkAttempts,
  backoffBaseMs: settings.backoffBaseMs,
});

const client = createMinioClient();
const store = new PrefixedFileStore(
  new S3FileStore({ client, bucket, maxAttempts: 2 }),
  s3Prefix,
);

await mongoose.connect(databaseUrl);

registerImportProcessors(
  {
    repository: new ContactImportRepository(),
    store,
    queue,
    settings,
  },
  Number(process.env.IMPORT_WORKER_CONCURRENCY ?? 1),
);
await queue.addRepeatable(
  IMPORT_JOB_NAME.SWEEP,
  {},
  { jobId: SWEEP_REPEAT_JOB_ID, everyMs: Number(process.env.IMPORT_SWEEP_INTERVAL_MS ?? 4000) },
);

const rssTimer = setInterval(() => {
  process.stdout.write(`RSS ${process.memoryUsage().rss}\n`);
}, 1_000);

process.stdout.write("READY\n");

const shutdown = async (): Promise<void> => {
  clearInterval(rssTimer);
  await queue.pause().catch(() => undefined);
  await queue.close().catch(() => undefined);
  client.destroy();
  await mongoose.disconnect().catch(() => undefined);
  process.exit(0);
};

process.on("SIGTERM", () => {
  void shutdown();
});
