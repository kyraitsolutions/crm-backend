import { spawn, spawnSync } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../../config/index.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const composeFile = path.join(root, "docker-compose.test.yml");
const project = "contact-import-test";

const COMPOSE_REDIS_URL = "redis://127.0.0.1:16379";
const COMPOSE_MINIO_ENDPOINT = "http://127.0.0.1:19000";

function dockerAvailable(): boolean {
  const info = spawnSync("docker", ["info"], { encoding: "utf8", timeout: 20_000 });
  if (info.status !== 0) {
    return false;
  }
  const compose = spawnSync("docker", ["compose", "version"], {
    encoding: "utf8",
    timeout: 20_000,
  });
  return compose.status === 0;
}

function compose(args: string[]): ReturnType<typeof spawnSync> {
  return spawnSync("docker", ["compose", "-p", project, "-f", composeFile, ...args], {
    encoding: "utf8",
    cwd: root,
  });
}

async function waitForPort(host: string, port: number, timeoutMs: number): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const open = await new Promise<boolean>((resolve) => {
      const socket = net.connect({ host, port });
      socket.once("connect", () => {
        socket.end();
        resolve(true);
      });
      socket.once("error", () => {
        socket.destroy();
        resolve(false);
      });
    });
    if (open) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${host}:${port}`);
}

function hasManualInfra(env: NodeJS.ProcessEnv): boolean {
  const redis = env.REDIS_URL?.trim();
  const minio = (env.MINIO_ENDPOINT ?? env.AWS_S3_ENDPOINT)?.trim();
  return Boolean(redis && minio);
}

function runJest(extraEnv: NodeJS.ProcessEnv = {}): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        "--expose-gc",
        "--experimental-vm-modules",
        path.join(root, "node_modules/jest/bin/jest.js"),
        "--config",
        path.join(root, "jest.integration.config.cjs"),
        "--runInBand",
        "--forceExit",
      ],
      {
        cwd: root,
        stdio: "inherit",
        env: {
          ...process.env,
          NODE_ENV: "test",
          ...extraEnv,
        },
      },
    );
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

async function main(): Promise<void> {
  if (hasManualInfra(process.env)) {
    console.log(
      "[test:integration] REDIS_URL and MINIO_ENDPOINT are set; running Jest without Docker.",
    );
    const code = await runJest();
    process.exit(code);
  }

  if (!dockerAvailable()) {
    console.log(
      "[test:integration] REDIS_URL/MINIO_ENDPOINT are unset and Docker is not available.",
    );
    console.log(
      "Set REDIS_URL and MINIO_ENDPOINT (see .env.example), or install Docker Desktop and retry.",
    );
    process.exit(0);
  }

  console.log("[test:integration] starting redis:7 and minio via docker-compose.test.yml");
  const up = compose(["up", "-d", "--remove-orphans"]);
  if (up.status !== 0) {
    console.error(up.stdout);
    console.error(up.stderr);
    throw new Error("docker compose up failed");
  }

  try {
    await waitForPort("127.0.0.1", 16379, 60_000);
    await waitForPort("127.0.0.1", 19000, 60_000);
    const code = await runJest({
      REDIS_URL: COMPOSE_REDIS_URL,
      MINIO_ENDPOINT: COMPOSE_MINIO_ENDPOINT,
      AWS_S3_ENDPOINT: COMPOSE_MINIO_ENDPOINT,
      AWS_S3_BUCKET: config.aws.bucket ?? "contact-import-test",
      AWS_S3_REGION: config.aws.s3Region,
      AWS_ACCESS_KEY_ID: config.aws.accessKeyId,
      AWS_SECRET_ACCESS_KEY: config.aws.secretAccessKey,
    });
    process.exit(code);
  } finally {
    compose(["down"]);
  }
}

main().catch((error) => {
  console.error(error);
  compose(["down"]);
  process.exit(1);
});
