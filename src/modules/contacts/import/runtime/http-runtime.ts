import os from "node:os";
import { config } from "../../../../config/index.js";
import { s3Client } from "../../../../config/s3.client.js";
import { settingsFromConfig } from "../config/import-env.js";
import { ContactImportHttpService, type ContactImportHttpDeps } from "../http/import-http.service.js";
import { LocalFilePresigner, S3FilePresigner, type FilePresigner } from "../http/presign.js";
import { SubscriptionImportQuota } from "../http/quota.js";
import { NoopScanner } from "../http/scan-port.js";
import { ImportSseHub } from "../http/sse-poller.js";
import { BullImportQueue } from "../queue/bull-queue.js";
import { MemoryQueue } from "../queue/memory-queue.js";
import type { QueuePort } from "../queue/queue-port.js";
import { ContactImportRepository } from "../repositories/contact-import.repository.js";
import type { FileStore } from "../store/file-store.js";
import { LocalFileStore } from "../store/local-file-store.js";
import { S3FileStore } from "../store/s3-file-store.js";

let singleton: ContactImportHttpService | undefined;

export function getContactImportHttpService(): ContactImportHttpService {
  if (!singleton) {
    singleton = new ContactImportHttpService(buildProductionHttpDeps());
  }
  return singleton;
}

export function buildProductionHttpDeps(): ContactImportHttpDeps {
  const repository = new ContactImportRepository();
  const importConfig = config.import;
  return {
    repository,
    store: createStore(),
    queue: createQueue(),
    settings: settingsFromConfig(),
    quota: new SubscriptionImportQuota(),
    presigner: createPresigner(),
    scanner: new NoopScanner(),
    sse: new ImportSseHub(
      repository,
      importConfig.ssePollMs,
      importConfig.sseHeartbeatMs,
      importConfig.sseMaxConnectionsPerUser,
    ),
    bucket: config.aws.bucket,
  };
}

function createStore(): FileStore {
  if (config.import.fileStore === "s3" && config.aws.bucket) {
    return new S3FileStore({
      client: s3Client,
      bucket: config.aws.bucket,
    });
  }
  return new LocalFileStore(
    config.import.localStoreRoot ?? `${os.tmpdir()}/contact-import-store`,
  );
}

function createPresigner(): FilePresigner {
  if (config.import.fileStore === "s3" && config.aws.bucket) {
    return new S3FilePresigner(s3Client, config.aws.bucket);
  }
  return new LocalFilePresigner();
}

function createQueue(): QueuePort {
  if (!config.redis.host) {
    return new MemoryQueue();
  }
  return new BullImportQueue({
    redis: {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.pass || undefined,
    },
    lockDurationMs: config.import.leaseMs,
  });
}
