import { spawn, type ChildProcess } from "node:child_process";
import { Types } from "mongoose";
import { ContactModel } from "../../../../../models/contact.model.js";
import { defaultRuntimeSettings } from "../../config/import-env.js";
import { parseStartImportRequest } from "../../dtos/import.dto.js";
import { handleValidatePlan } from "../../handlers/validate-plan.handler.js";
import { ContactImportRepository } from "../../repositories/contact-import.repository.js";
import { startImport } from "../../services/import-lifecycle.service.js";
import { errorReportKey } from "../../store/file-keys.js";
import {
  importTestMongoUri,
  resetImportCollections,
  startImportTestMongo,
  stopImportTestMongo,
} from "../mongo-test-env.js";
import { buildContactCsv, defaultStart } from "../orchestration-helpers.js";
import { putText, workspace } from "../test-helpers.js";
import {
  childPath,
  createPrefixedMinioStore,
  createTestBullQueue,
  requireIntegrationEnv,
  tsxCliPath,
  waitFor,
} from "./helpers.js";

const enabled = Boolean(process.env.REDIS_URL && (process.env.MINIO_ENDPOINT ?? process.env.AWS_S3_ENDPOINT));
const describeE2E = enabled ? describe : describe.skip;
const RSS_SOFT_LIMIT = 512 * 1024 * 1024;

describeE2E("100k-row import on real Bull + Mongo + MinIO", () => {
  const repo = new ContactImportRepository();

  beforeAll(async () => {
    requireIntegrationEnv();
    await startImportTestMongo();
  }, 120_000);

  afterAll(async () => {
    await stopImportTestMongo();
  });

  beforeEach(async () => {
    await resetImportCollections();
    await ContactModel.deleteMany({});
  });

  it(
    "completes with exact totals after SIGKILL of one of two workers",
    async () => {
      const minio = await createPrefixedMinioStore();
      const queue = createTestBullQueue(minio.ids, {
        lockDurationMs: 8_000,
        stalledIntervalMs: 2_000,
        backoffBaseMs: 200,
      });
      const workers: ChildProcess[] = [];
      const rss = [{ peak: 0 }, { peak: 0 }];
      try {
        const ws = workspace();
        const { csv, failedRowNumbers } = buildContactCsv(100_000, { failEvery: 1000 });
        await putText(minio.store, "big.csv", csv);
        const job = await repo.createJob({
          workspaceId: ws,
          createdBy: new Types.ObjectId().toHexString(),
          file: {
            bucket: "contact-import-test",
            key: "big.csv",
            fileName: "contacts.csv",
            mimeType: "text/csv",
            byteSize: Buffer.byteLength(csv),
          },
        });
        const deps = {
          repository: repo,
          store: minio.store,
          queue,
          settings: defaultRuntimeSettings({
            rowsPerChunk: 2000,
            dispatchK: 3,
            heartbeatMs: 2000,
            leaseMs: 6000,
            stallMaxMs: 10 * 60 * 1000,
            chunkAttempts: 5,
            backoffBaseMs: 200,
          }),
        };
        const skipStart = parseStartImportRequest({
          mapping: defaultStart.mapping,
          defaultCountry: "IN",
          policy: "skip",
        });
        await handleValidatePlan(deps, ws, job.id);
        const started = await startImport(deps, ws, job.id, skipStart);
        expect(started.ok).toBe(true);

        const wallStart = Date.now();
        for (let index = 0; index < 2; index += 1) {
          const child = spawnWorker(minio.ids, rss[index]!);
          workers.push(child);
          await waitForChildText(child, "READY", 30_000);
        }

        await waitFor(async () => {
          const current = await repo.getJob(ws, job.id);
          return (current?.counters.processed ?? 0) > 2_000;
        }, 180_000, "first chunks to land");

        workers[0]?.kill("SIGKILL");

        await waitFor(async () => {
          const current = await repo.getJob(ws, job.id);
          return (
            current?.status === "completed" || current?.status === "completed_with_errors"
          );
        }, 420_000, "import to finish after SIGKILL");

        const elapsedSec = (Date.now() - wallStart) / 1000;
        const rowsPerSec = 100_000 / elapsedSec;
        const peakRss = Math.max(rss[0]!.peak, rss[1]!.peak);
        console.log(
          `E2E 100k: rows/sec=${rowsPerSec.toFixed(1)} peakRssMB=${(peakRss / (1024 * 1024)).toFixed(1)} worker0MB=${(rss[0]!.peak / (1024 * 1024)).toFixed(1)} worker1MB=${(rss[1]!.peak / (1024 * 1024)).toFixed(1)}`,
        );
        if (peakRss >= RSS_SOFT_LIMIT) {
          console.warn(`SOFT ASSERT peak RSS ${(peakRss / (1024 * 1024)).toFixed(1)} MB >= 512 MB`);
        }

        const finished = await repo.getJob(ws, job.id);
        expect(finished?.status).toBe("completed_with_errors");
        expect(finished?.counters.processed).toBe(100_000);
        expect(finished?.counters.failed).toBe(failedRowNumbers.length);
        expect(finished?.counters.inserted).toBe(100_000 - failedRowNumbers.length);

        const accountId = new Types.ObjectId(ws.accountId);
        const contactCount = await ContactModel.countDocuments({ accountId });
        const emails = await ContactModel.distinct("email", { accountId });
        expect(contactCount).toBe(100_000 - failedRowNumbers.length);
        expect(emails).toHaveLength(contactCount);

        const report = await readText(minio.store, errorReportKey(job.id));
        const lines = report.trim().split("\n");
        expect(lines[0]).toBe("rowNumber,reason,column,rawValue,raw");
        expect(lines.length - 1).toBe(failedRowNumbers.length);
        const reported = lines.slice(1).map((line) => Number(line.split(",")[0]));
        expect(reported).toEqual(failedRowNumbers);
      } finally {
        for (const worker of workers) {
          if (worker.exitCode === null && worker.signalCode === null) {
            worker.kill("SIGKILL");
          }
        }
        await queue.obliterate().catch(() => undefined);
        await queue.close().catch(() => undefined);
        await minio.cleanup();
      }
    },
    600_000,
  );
});

function spawnWorker(
  ids: { queueName: string; bullPrefix: string; s3Prefix: string },
  rss: { peak: number },
): ChildProcess {
  const child = spawn(process.execPath, [tsxCliPath(), childPath("e2e-worker-child.ts")], {
    env: {
      ...process.env,
      DATABASE_URL: importTestMongoUri(),
      IMPORT_QUEUE_NAME: ids.queueName,
      IMPORT_BULL_PREFIX: ids.bullPrefix,
      IMPORT_S3_KEY_PREFIX: ids.s3Prefix,
      IMPORT_CHUNK_ROWS: "2000",
      IMPORT_DISPATCH_K: "3",
      IMPORT_HEARTBEAT_MS: "2000",
      IMPORT_LEASE_MS: "6000",
      IMPORT_SWEEP_INTERVAL_MS: "4000",
      IMPORT_WORKER_CONCURRENCY: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout?.on("data", (chunk: Buffer) => {
    const text = chunk.toString("utf8");
    for (const line of text.split(/\r?\n/)) {
      if (line.startsWith("RSS ")) {
        const value = Number(line.slice(4));
        if (Number.isFinite(value) && value > rss.peak) {
          rss.peak = value;
        }
      }
    }
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    process.stderr.write(chunk);
  });
  return child;
}

function waitForChildText(child: ChildProcess, token: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onExit = (code: number | null): void => {
      clearTimeout(timer);
      reject(new Error(`child exited ${code} before ${token}: ${buf}`));
    };
    const timer = setTimeout(() => {
      child.off("exit", onExit);
      reject(new Error(`child did not emit ${token}`));
    }, timeoutMs);
    let buf = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      buf += chunk.toString("utf8");
      if (buf.includes(token)) {
        clearTimeout(timer);
        child.off("exit", onExit);
        resolve();
      }
    });
    child.on("exit", onExit);
  });
}

async function readText(
  store: { createReadStream: (key: string) => Promise<NodeJS.ReadableStream> },
  key: string,
): Promise<string> {
  const stream = await store.createReadStream(key);
  const parts: Buffer[] = [];
  for await (const chunk of stream) {
    parts.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(parts).toString("utf8");
}
