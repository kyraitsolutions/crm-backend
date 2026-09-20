import { randomBytes } from "node:crypto";

const LOCAL_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
  "redis",
  "minio",
]);

export interface IntegrationRunIds {
  runId: string;
  queueName: string;
  bullPrefix: string;
  s3Prefix: string;
}

export function isLocalHostname(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/^\[|\]$/g, "");
  return LOCAL_HOSTS.has(host);
}

export function isLocalUrl(raw: string | undefined): boolean {
  if (!raw || raw.trim() === "") {
    return false;
  }
  try {
    const parsed = new URL(raw);
    return isLocalHostname(parsed.hostname);
  } catch {
    return false;
  }
}

export function assertSafeIntegrationTargets(
  env: NodeJS.ProcessEnv = process.env,
): void {
  const allowRemote = env.IMPORT_TEST_ALLOW_REMOTE === "1";
  const redisUrl = env.REDIS_URL;
  const s3Endpoint = env.MINIO_ENDPOINT ?? env.AWS_S3_ENDPOINT;
  if (redisUrl && !isLocalUrl(redisUrl) && !allowRemote) {
    throw new Error(
      `REDIS_URL is not local (${redisUrl}). Refusing to run integration tests against a remote Redis. Set IMPORT_TEST_ALLOW_REMOTE=1 to override.`,
    );
  }
  if (s3Endpoint && !isLocalUrl(s3Endpoint) && !allowRemote) {
    throw new Error(
      `S3 endpoint is not local (${s3Endpoint}). Refusing to run integration tests against a remote bucket. Set IMPORT_TEST_ALLOW_REMOTE=1 to override.`,
    );
  }
}

export function newIntegrationRunIds(): IntegrationRunIds {
  const runId = `${Date.now()}-${randomBytes(4).toString("hex")}`;
  return {
    runId,
    queueName: `ci-import-${runId}`,
    bullPrefix: `bull-ci-${runId}`,
    s3Prefix: `test-runs/${runId}`,
  };
}

export function parseRedisUrl(url: string): {
  host: string;
  port: number;
  password?: string;
} {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 6379,
    password: parsed.password || undefined,
  };
}
