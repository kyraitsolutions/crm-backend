import {
  CreateBucketCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BullImportQueue } from "../../queue/bull-queue.js";
import { PrefixedFileStore } from "../../store/prefixed-file-store.js";
import { S3FileStore } from "../../store/s3-file-store.js";
import {
  assertSafeIntegrationTargets,
  newIntegrationRunIds,
  parseRedisUrl,
  type IntegrationRunIds,
} from "../integration-safety.js";
import { config } from "../../../../../config/index.js";

const require = createRequire(import.meta.url);

export function tsxCliPath(): string {
  return path.join(path.dirname(require.resolve("tsx/package.json")), "dist/cli.mjs");
}

export function childPath(name: string): string {
  return path.join(path.dirname(fileURLToPath(import.meta.url)), name);
}

export function requireIntegrationEnv(): {
  redisUrl: string;
  minioEndpoint: string;
  bucket: string;
} {
  const redisUrl = process.env.REDIS_URL;
  const minioEndpoint = process.env.MINIO_ENDPOINT ?? process.env.AWS_S3_ENDPOINT;
  if (!redisUrl || !minioEndpoint) {
    throw new Error(
      "REDIS_URL and MINIO_ENDPOINT are required. Run npm run test:integration.",
    );
  }
  assertSafeIntegrationTargets();
  return {
    redisUrl,
    minioEndpoint,
    bucket: process.env.AWS_S3_BUCKET ?? "contact-import-test",
  };
}

export function createMinioClient(endpoint = requireIntegrationEnv().minioEndpoint): S3Client {
  return new S3Client({
    region: config.aws.s3Region,
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
    },
  });
}

export async function ensureBucket(client: S3Client, bucket: string): Promise<void> {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
  }
}

export async function deletePrefix(
  client: S3Client,
  bucket: string,
  prefix: string,
): Promise<void> {
  let token: string | undefined;
  do {
    const listed = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: token,
      }),
    );
    for (const object of listed.Contents ?? []) {
      if (object.Key) {
        await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: object.Key }));
      }
    }
    token = listed.IsTruncated ? listed.NextContinuationToken : undefined;
  } while (token);
}

export function createTestBullQueue(
  ids: IntegrationRunIds,
  overrides: { lockDurationMs?: number; stalledIntervalMs?: number; backoffBaseMs?: number } = {},
): BullImportQueue {
  const { redisUrl } = requireIntegrationEnv();
  return new BullImportQueue({
    redis: parseRedisUrl(redisUrl),
    queueName: ids.queueName,
    prefix: ids.bullPrefix,
    lockDurationMs: overrides.lockDurationMs ?? 8_000,
    stalledIntervalMs: overrides.stalledIntervalMs ?? 1_000,
    attempts: 5,
    backoffBaseMs: overrides.backoffBaseMs ?? 50,
  });
}

export async function createPrefixedMinioStore(): Promise<{
  ids: IntegrationRunIds;
  store: PrefixedFileStore;
  inner: S3FileStore;
  client: S3Client;
  bucket: string;
  cleanup: () => Promise<void>;
}> {
  const env = requireIntegrationEnv();
  const ids = newIntegrationRunIds();
  const client = createMinioClient();
  await ensureBucket(client, env.bucket);
  const inner = new S3FileStore({ client, bucket: env.bucket, maxAttempts: 2 });
  const store = new PrefixedFileStore(inner, ids.s3Prefix);
  return {
    ids,
    store,
    inner,
    client,
    bucket: env.bucket,
    cleanup: async () => {
      await deletePrefix(client, env.bucket, ids.s3Prefix);
      client.destroy();
    },
  };
}

export async function waitFor(
  check: () => Promise<boolean>,
  timeoutMs: number,
  label = "condition",
): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await check()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`timed out waiting for ${label}`);
}
