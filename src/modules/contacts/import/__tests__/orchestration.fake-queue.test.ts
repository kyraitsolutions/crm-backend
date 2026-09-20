import { Types } from "mongoose";
import { ContactModel } from "../../../../models/contact.model.js";
import { IMPORT_ERROR_CODE } from "../constants/import.constant.js";
import { parseStartImportRequest } from "../dtos/import.dto.js";
import { TransientError } from "../errors/import-worker.errors.js";
import { handleFinalize } from "../handlers/finalize.handler.js";
import { handleSweep } from "../handlers/sweeper.handler.js";
import { handleValidatePlan } from "../handlers/validate-plan.handler.js";
import { errorPartKey } from "../pipeline/error-part.js";
import { chunkJobId, finalizeJobId } from "../queue/queue-port.js";
import { ContactImportRepository } from "../repositories/contact-import.repository.js";
import {
  cancelImport,
  pauseImport,
  resumeImport,
  startImport,
} from "../services/import-lifecycle.service.js";
import type { FileStore } from "../store/file-store.js";
import { processChunk } from "../worker/process-chunk.js";
import {
  resetImportCollections,
  startImportTestMongo,
  stopImportTestMongo,
} from "./mongo-test-env.js";
import {
  buildContactCsv,
  defaultStart,
  planAndStart,
  wireRuntime,
} from "./orchestration-helpers.js";
import { createTempStore, putText, workspace } from "./test-helpers.js";

const repo = new ContactImportRepository();

async function createUploadedJob(
  ws: ReturnType<typeof workspace>,
  fileKey: string,
): Promise<string> {
  const job = await repo.createJob({
    workspaceId: ws,
    createdBy: new Types.ObjectId().toHexString(),
    file: {
      bucket: "test",
      key: fileKey,
      fileName: "contacts.csv",
      mimeType: "text/csv",
      byteSize: 100,
    },
  });
  return job.id;
}

describe("import orchestration (fake queue)", () => {
  beforeAll(async () => {
    await startImportTestMongo();
  }, 120_000);

  afterAll(async () => {
    await stopImportTestMongo();
  });

  beforeEach(async () => {
    await resetImportCollections();
    await ContactModel.deleteMany({});
  }, 120_000);

  it("replays after a crash between bulkWrite and completeChunk without duplicates", async () => {
    const { store, cleanup } = await createTempStore();
    try {
      const ws = workspace();
      const { csv } = buildContactCsv(30);
      await putText(store, "crash.csv", csv);
      const jobId = await createUploadedJob(ws, "crash.csv");
      const { deps, queue } = wireRuntime(repo, store, {
        rowsPerChunk: 10,
        dispatchK: 1,
        leaseMs: 40,
        heartbeatMs: 10,
      });
      await handleValidatePlan(deps, ws, jobId);
      const chunks = await repo.listChunks(ws, jobId);
      const first = chunks[0];
      if (!first) {
        throw new Error("expected chunks");
      }

      await expect(
        processChunk(
          {
            workspaceId: ws,
            jobId,
            repository: repo,
            store,
            leaseMs: 40,
            onPhase: (phase) => {
              if (phase === "written") {
                throw new Error("crash after bulkWrite");
              }
            },
          },
          {
            index: first.index,
            startRow: first.startRow,
            endRow: first.endRow,
            byteOffsetStart: first.byteOffsetStart,
            byteOffsetEnd: first.byteOffsetEnd,
          },
        ),
      ).rejects.toThrow("crash after bulkWrite");

      await new Promise((resolve) => setTimeout(resolve, 50));
      await handleSweep(deps, new Date(Date.now() + 100));
      await planAndStart(deps, ws, jobId);
      await queue.drain();

      const job = await repo.getJob(ws, jobId);
      expect(job?.status).toBe("completed");
      expect(job?.counters.inserted).toBe(30);
      expect(job?.counters.processed).toBe(30);
      expect(await ContactModel.countDocuments({ accountId: ws.accountId })).toBe(30);
    } finally {
      await cleanup();
    }
  });

  it("rebuilds a wiped queue from Mongo and finishes the import", async () => {
    const { store, cleanup } = await createTempStore();
    try {
      const ws = workspace();
      const { csv } = buildContactCsv(40);
      await putText(store, "wipe.csv", csv);
      const jobId = await createUploadedJob(ws, "wipe.csv");
      const { deps, queue } = wireRuntime(repo, store, { rowsPerChunk: 10, dispatchK: 2 });
      await planAndStart(deps, ws, jobId);
      await queue.deliver(chunkJobId(jobId, 0));
      queue.loseAll();
      await handleSweep(deps);
      await queue.drain();

      const job = await repo.getJob(ws, jobId);
      expect(job?.status).toBe("completed");
      expect(job?.counters.inserted).toBe(40);
      expect(await ContactModel.countDocuments({ accountId: ws.accountId })).toBe(40);
    } finally {
      await cleanup();
    }
  });

  it("treats a duplicate chunk delivery as a single effect", async () => {
    const { store, cleanup } = await createTempStore();
    try {
      const ws = workspace();
      const { csv } = buildContactCsv(12);
      await putText(store, "dup.csv", csv);
      const jobId = await createUploadedJob(ws, "dup.csv");
      const { deps, queue } = wireRuntime(repo, store, { rowsPerChunk: 12, dispatchK: 1 });
      await planAndStart(deps, ws, jobId);
      await queue.deliverTwice(chunkJobId(jobId, 0));
      await queue.drain();

      const job = await repo.getJob(ws, jobId);
      expect(job?.status).toBe("completed");
      expect(job?.counters.inserted).toBe(12);
      expect(await ContactModel.countDocuments({ accountId: ws.accountId })).toBe(12);
    } finally {
      await cleanup();
    }
  });

  it("finalizes only once when finalize is delivered twice", async () => {
    const { store, cleanup } = await createTempStore();
    try {
      const ws = workspace();
      const { csv } = buildContactCsv(8);
      await putText(store, "fin.csv", csv);
      const jobId = await createUploadedJob(ws, "fin.csv");
      const { deps, queue } = wireRuntime(repo, store, { rowsPerChunk: 8, dispatchK: 1 });
      await planAndStart(deps, ws, jobId);
      await queue.deliver(chunkJobId(jobId, 0));
      await handleFinalize(deps, ws, jobId);
      await handleFinalize(deps, ws, jobId);
      await queue.deliverTwice(finalizeJobId(jobId));

      const job = await repo.getJob(ws, jobId);
      expect(job?.status).toBe("completed");
      expect(job?.counters.inserted).toBe(8);
    } finally {
      await cleanup();
    }
  });

  it("respects org slot caps and lets a small import finish before a large one", async () => {
    const { store, cleanup } = await createTempStore();
    try {
      const orgs = [
        new Types.ObjectId().toHexString(),
        new Types.ObjectId().toHexString(),
        new Types.ObjectId().toHexString(),
      ];
      const events: string[] = [];
      const { deps, queue } = wireRuntime(repo, store, {
        rowsPerChunk: 5,
        dispatchK: 2,
        orgActiveSlots: 2,
      });
      queue.onProcessed = (job) => {
        if (job.name === "import:finalize") {
          events.push(`done:${String(job.data.jobId)}`);
        }
        if (job.name === "import:chunk") {
          events.push(`chunk:${String(job.data.jobId)}:${String(job.data.index)}`);
        }
      };

      const jobs: Array<{
        id: string;
        size: "small" | "large";
        ws: { organizationId: string; accountId: string };
      }> = [];
      let phoneOffset = 0;
      const sizes: Array<"small" | "large"> = [
        "small",
        "large",
        "small",
        "large",
        "small",
        "large",
        "small",
        "large",
        "small",
        "large",
      ];
      for (const [index, size] of sizes.entries()) {
        const org = orgs[index % 3];
        if (!org) {
          throw new Error("org");
        }
        const ws = { organizationId: org, accountId: new Types.ObjectId().toHexString() };
        const rows = size === "small" ? 5 : 25;
        const { csv } = buildContactCsv(rows, { offset: phoneOffset });
        phoneOffset += rows;
        const key = `fair-${index}.csv`;
        await putText(store, key, csv);
        const jobId = await createUploadedJob(ws, key);
        await planAndStart(deps, ws, jobId);
        jobs.push({ id: jobId, size, ws });
      }

      const processing = await repo.listJobsByStatus("processing", 50);
      const byOrg = new Map<string, number>();
      for (const job of processing) {
        byOrg.set(job.organizationId, (byOrg.get(job.organizationId) ?? 0) + 1);
      }
      for (const count of byOrg.values()) {
        expect(count).toBeLessThanOrEqual(2);
      }

      for (let cycle = 0; cycle < 20; cycle += 1) {
        await queue.drain();
        await handleSweep(deps);
        const open: string[] = [];
        for (const job of jobs) {
          const record = await repo.getJob(job.ws, job.id);
          if (record && record.status !== "completed" && record.status !== "completed_with_errors") {
            open.push(job.id);
          }
        }
        if (open.length === 0 && queue.pendingCount() === 0) {
          break;
        }
        if (cycle === 19) {
          throw new Error(`imports still open: ${open.join(",")}`);
        }
      }

      const firstSmall = jobs.find((job) => job.size === "small");
      const firstLarge = jobs.find((job) => job.size === "large");
      if (!firstSmall || !firstLarge) {
        throw new Error("expected small and large jobs");
      }
      const smallDone = events.indexOf(`done:${firstSmall.id}`);
      const largeLast = events.findIndex((event) => event === `chunk:${firstLarge.id}:4`);
      expect(smallDone).toBeGreaterThanOrEqual(0);
      expect(largeLast).toBeGreaterThanOrEqual(0);
      expect(smallDone).toBeLessThan(largeLast);

      for (const job of jobs) {
        const found = await repo.getJob(job.ws, job.id);
        expect(found?.status).toBe("completed");
      }
    } finally {
      await cleanup();
    }
  }, 120_000);

  it("pauses, resumes, and cancels at chunk boundaries", async () => {
    const { store, cleanup } = await createTempStore();
    try {
      const ws = workspace();
      const { csv } = buildContactCsv(30);
      await putText(store, "life.csv", csv);
      const jobId = await createUploadedJob(ws, "life.csv");
      const { deps, queue } = wireRuntime(repo, store, { rowsPerChunk: 10, dispatchK: 1 });
      await planAndStart(deps, ws, jobId);
      await queue.deliver(chunkJobId(jobId, 0));

      await pauseImport(deps, ws, jobId);
      await queue.drain();
      let job = await repo.getJob(ws, jobId);
      expect(job?.status).toBe("paused");
      const pausedChunks = await repo.listChunks(ws, jobId);
      expect(pausedChunks.filter((chunk) => chunk.status === "done")).toHaveLength(1);
      expect(pausedChunks.filter((chunk) => chunk.status === "pending")).toHaveLength(2);

      await resumeImport(deps, ws, jobId);
      await queue.deliver(chunkJobId(jobId, 1));
      await cancelImport(deps, ws, jobId);
      await queue.drain();
      job = await repo.getJob(ws, jobId);
      expect(job?.status).toBe("cancelled");
      expect(job?.errorReportKey).toBeUndefined();
      const leftover = await repo.listChunks(ws, jobId);
      expect(leftover.some((chunk) => chunk.status === "pending")).toBe(true);
    } finally {
      await cleanup();
    }
  });

  it("produces identical chunk docs when validate/plan runs twice", async () => {
    const { store, cleanup } = await createTempStore();
    try {
      const ws = workspace();
      const { csv } = buildContactCsv(25);
      await putText(store, "twice.csv", csv);
      const jobId = await createUploadedJob(ws, "twice.csv");
      const { deps } = wireRuntime(repo, store, { rowsPerChunk: 10 });
      await handleValidatePlan(deps, ws, jobId);
      const first = await repo.listChunks(ws, jobId);
      await handleValidatePlan(deps, ws, jobId);
      const second = await repo.listChunks(ws, jobId);
      expect(second).toHaveLength(first.length);
      expect(
        second.map((chunk) => ({
          index: chunk.index,
          startRow: chunk.startRow,
          endRow: chunk.endRow,
          byteOffsetStart: chunk.byteOffsetStart,
          byteOffsetEnd: chunk.byteOffsetEnd,
        })),
      ).toEqual(
        first.map((chunk) => ({
          index: chunk.index,
          startRow: chunk.startRow,
          endRow: chunk.endRow,
          byteOffsetStart: chunk.byteOffsetStart,
          byteOffsetEnd: chunk.byteOffsetEnd,
        })),
      );
      const job = await repo.getJob(ws, jobId);
      expect(job?.status).toBe("mapping");
    } finally {
      await cleanup();
    }
  });

  it("retries transient chunk errors and fails permanent ones without throwing", async () => {
    const { store, cleanup } = await createTempStore();
    try {
      const ws = workspace();
      const { csv } = buildContactCsv(10);
      await putText(store, "class.csv", csv);
      const jobId = await createUploadedJob(ws, "class.csv");
      let blows = 1;
      const flaky: FileStore = {
        createReadStream: async (key, range) => {
          if (key === "class.csv" && blows > 0) {
            blows -= 1;
            throw new TransientError("s3 blip", "IMPORT_S3_TRANSIENT");
          }
          return store.createReadStream(key, range);
        },
        putStream: (key, stream) => store.putStream(key, stream),
        exists: (key) => store.exists(key),
        delete: (key) => store.delete(key),
        size: (key) => store.size(key),
      };
      const planned = wireRuntime(repo, store, { rowsPerChunk: 10, dispatchK: 1 });
      await handleValidatePlan(planned.deps, ws, jobId);
      const { deps, queue } = wireRuntime(repo, flaky, { rowsPerChunk: 10, dispatchK: 1 });
      const started = await startImport(deps, ws, jobId, defaultStart);
      expect(started.ok).toBe(true);
      await queue.drain();
      const recovered = await repo.getJob(ws, jobId);
      expect(recovered?.status).toBe("completed");
      expect(recovered?.counters.inserted).toBe(10);

      const ws2 = workspace();
      await putText(store, "gone.csv", buildContactCsv(8).csv);
      const job2 = await createUploadedJob(ws2, "gone.csv");
      const { deps: deps2, queue: queue2 } = wireRuntime(repo, store, {
        rowsPerChunk: 8,
        dispatchK: 1,
      });
      await handleValidatePlan(deps2, ws2, job2);
      await store.delete("gone.csv");
      const started2 = await startImport(deps2, ws2, job2, defaultStart);
      expect(started2.ok).toBe(true);
      await queue2.drain();
      const failed = await repo.getJob(ws2, job2);
      expect(failed?.status).toBe("completed_with_errors");
      const chunks = await repo.listChunks(ws2, job2);
      expect(chunks[0]?.status).toBe("failed");
      expect(chunks[0]?.lastError?.includes(IMPORT_ERROR_CODE.IMPORT_NOT_FOUND) ?? false).toBe(
        true,
      );
    } finally {
      await cleanup();
    }
  });

  it("re-enqueues a reset chunk with the same Bull id and the handler runs again", async () => {
    const { store, cleanup } = await createTempStore();
    try {
      const ws = workspace();
      const { csv } = buildContactCsv(5);
      await putText(store, "repeat.csv", csv);
      const jobId = await createUploadedJob(ws, "repeat.csv");
      const { deps, queue } = wireRuntime(repo, store, {
        rowsPerChunk: 5,
        dispatchK: 1,
        heartbeatMs: 0,
      });
      await planAndStart(deps, ws, jobId);
      await queue.drain();
      const firstId = chunkJobId(jobId, 0);
      expect(queue.processed.filter((id) => id === firstId)).toHaveLength(1);

      const chunk = await repo.getChunk(ws, jobId, 0);
      expect(chunk?.status).toBe("done");
      const { ContactImportChunkModel } = await import(
        "../models/contact-import-chunk.model.js"
      );
      await ContactImportChunkModel.updateOne(
        { jobId: new Types.ObjectId(jobId), index: 0 },
        {
          $set: { status: "pending", totalsApplied: true },
          $unset: { leaseToken: 1, leaseExpiresAt: 1, lockedAt: 1 },
        },
      );

      const enqueued = await queue.enqueue(
        "import:chunk",
        {
          jobId,
          organizationId: ws.organizationId,
          accountId: ws.accountId,
          index: 0,
        },
        { jobId: firstId },
      );
      expect(enqueued).toBe(true);
      await queue.drain();
      expect(queue.processed.filter((id) => id === firstId).length).toBeGreaterThanOrEqual(2);
      expect(await ContactModel.countDocuments({ accountId: ws.accountId })).toBe(5);
    } finally {
      await cleanup();
    }
  });

  it("fails validate/plan with a reason code on a permanently bad file", async () => {
    const { store, cleanup } = await createTempStore();
    try {
      const ws = workspace();
      await putText(store, "empty.csv", "");
      const jobId = await createUploadedJob(ws, "empty.csv");
      const { deps } = wireRuntime(repo, store);
      await handleValidatePlan(deps, ws, jobId);
      const job = await repo.getJob(ws, jobId);
      expect(job?.status).toBe("failed");
      expect(job?.errorMessage?.includes(IMPORT_ERROR_CODE.IMPORT_EMPTY)).toBe(true);
    } finally {
      await cleanup();
    }
  });
});

describe("error part keys stay deterministic", () => {
  it("uses errors/{jobId}/{index}.csv", () => {
    expect(errorPartKey("abc", 2)).toBe("errors/abc/2.csv");
  });
});
