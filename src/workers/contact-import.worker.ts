import { S3Client } from "@aws-sdk/client-s3";
import mongoose from "mongoose";
import os from "node:os";
import { Redis } from "ioredis";
import { config } from "../config/index.js";
import { settingsFromConfig } from "../modules/contacts/import/config/import-env.js";
import { SubscriptionImportQuota } from "../modules/contacts/import/http/quota.js";
import { ContactImportRepository } from "../modules/contacts/import/repositories/contact-import.repository.js";
import { registerImportProcessors } from "../modules/contacts/import/runtime/register-processors.js";
import { LocalFileStore } from "../modules/contacts/import/store/local-file-store.js";
import { S3FileStore } from "../modules/contacts/import/store/s3-file-store.js";
import { sweepOrphanXlsxTemp } from "../modules/contacts/import/store/xlsx-temp.js";
import type { FileStore } from "../modules/contacts/import/store/file-store.js";
import { BullImportQueue } from "../queue/contact-import.queue.js";
import { scheduleImportRepeatables } from "../queue/contact-import.queue.js";
import logger from "../utils/logger.js";

async function main(): Promise<void> {
  const importConfig = config.import;
  const settings = settingsFromConfig();

  if (!config.db.url) {
    throw new Error("DATABASE_URL is required");
  }
  if (!config.redis.host) {
    throw new Error("REDIS_HOST is required");
  }

  await mongoose.connect(config.db.url);
  logger.info("CONTACT_IMPORT_WORKER mongo connected");

  const redis = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.pass || undefined,
    lazyConnect: true,
    maxRetriesPerRequest: null,
  });
  await redis.connect();
  await assertNoeviction(redis, importConfig.checkRedisPolicy);

  const tempRoot = importConfig.xlsxTempDir ?? os.tmpdir();
  const swept = await sweepOrphanXlsxTemp(tempRoot);
  if (swept > 0) {
    logger.info("CONTACT_IMPORT_WORKER swept xlsx temp", { swept });
  }

  const store = createStore();
  const queue = new BullImportQueue({
    redis: {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.pass || undefined,
    },
    lockDurationMs: settings.leaseMs,
    attempts: importConfig.chunkAttempts,
    backoffBaseMs: importConfig.backoffBaseMs,
  });

  const deps = {
    repository: new ContactImportRepository(),
    store,
    queue,
    settings,
    quota: new SubscriptionImportQuota(),
  };
  registerImportProcessors(deps, importConfig.workerConcurrency);
  await scheduleImportRepeatables(queue, importConfig.sweepIntervalMs);
  logger.info("CONTACT_IMPORT_WORKER ready", {
    concurrency: importConfig.workerConcurrency,
    leaseMs: settings.leaseMs,
  });

  const shutdown = async (): Promise<void> => {
    logger.info("CONTACT_IMPORT_WORKER shutting down");
    await queue.pause();
    const deadline = Date.now() + importConfig.gracefulShutdownMs;
    while (Date.now() < deadline) {
      const active = await queue.queue.getActiveCount();
      if (active === 0) {
        break;
      }
      await sleep(250);
    }
    await queue.close();
    redis.disconnect();
    await mongoose.disconnect();
    process.exit(0);
  };

  process.on("SIGTERM", () => {
    void shutdown();
  });
  process.on("SIGINT", () => {
    void shutdown();
  });
}

function createStore(): FileStore {
  if (config.import.fileStore === "s3") {
    if (!config.aws.bucket) {
      throw new Error("AWS_S3_BUCKET is required when IMPORT_FILE_STORE=s3");
    }
    return new S3FileStore({
      client: new S3Client({
        region: config.aws.s3Region || config.aws.region || "us-east-1",
        credentials:
          config.aws.accessKeyId && config.aws.secretAccessKey
            ? {
                accessKeyId: config.aws.accessKeyId,
                secretAccessKey: config.aws.secretAccessKey,
              }
            : undefined,
      }),
      bucket: config.aws.bucket,
    });
  }
  return new LocalFileStore(
    config.import.localStoreRoot ?? `${os.tmpdir()}/contact-import-store`,
  );
}

async function assertNoeviction(redis: Redis, checkEnabled: boolean): Promise<void> {
  try {
    const reply = await redis.config("GET", "maxmemory-policy");
    const policy = Array.isArray(reply) ? String(reply[1] ?? "") : "";
    if (policy !== "noeviction") {
      logger.error("CONTACT_IMPORT_WORKER redis maxmemory-policy is not noeviction", {
        policy,
      });
    }
  } catch (error) {
    if (checkEnabled) {
      logger.error("CONTACT_IMPORT_WORKER could not read redis maxmemory-policy", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

main().catch((error: unknown) => {
  logger.error("CONTACT_IMPORT_WORKER failed to start", {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
