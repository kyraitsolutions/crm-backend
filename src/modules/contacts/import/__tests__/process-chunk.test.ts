import { ContactModel } from "../../../../models/contact.model.js";
import { parseStartImportRequest } from "../dtos/import.dto.js";
import { planChunks } from "../parser/chunker.js";
import { ContactImportRepository } from "../repositories/contact-import.repository.js";
import { processChunk } from "../worker/process-chunk.js";
import {
  resetImportCollections,
  startImportTestMongo,
  stopImportTestMongo,
} from "./mongo-test-env.js";
import {
  createTempStore,
  indianPhone,
  phoneCsv,
  prepareProcessingJob,
  putText,
  workspace,
} from "./test-helpers.js";

const repo = new ContactImportRepository();

const start = parseStartImportRequest({
  mapping: [
    { source: "name", target: "name" },
    { source: "phone", target: "phone" },
    { source: "email", target: "email" },
  ],
  defaultCountry: "IN",
});

function contacts(count: number, offset = 0) {
  return Array.from({ length: count }, (_, index) => ({
    name: `N${offset + index}`,
    phone: indianPhone(offset + index),
    email: `u${offset + index}@kyra.test`,
  }));
}

describe("processChunk", () => {
  beforeAll(async () => {
    await startImportTestMongo();
  }, 120_000);

  afterAll(async () => {
    await stopImportTestMongo();
  });

  beforeEach(async () => {
    await resetImportCollections();
  });

  it("resumes after a mid-file throw with the same totals and no duplicate contacts", async () => {
    const { store, cleanup } = await createTempStore();
    try {
      const ws = workspace();
      await putText(store, "source.csv", phoneCsv(contacts(25)));
      const jobId = await prepareProcessingJob(repo, ws, "source.csv", start);
      const descriptors = await planChunks(store, "source.csv", {
        delimiter: ",",
        rowsPerChunk: 10,
      });
      expect(descriptors.length).toBe(3);

      const ctx = { workspaceId: ws, jobId, repository: repo, store };
      try {
        for (const [index, descriptor] of descriptors.entries()) {
          if (index === 1) {
            throw new Error("boom");
          }
          await processChunk(ctx, descriptor);
        }
        throw new Error("expected mid-file throw");
      } catch (error) {
        expect(error instanceof Error ? error.message : "").toBe("boom");
      }

      for (const descriptor of descriptors) {
        await processChunk(ctx, descriptor);
      }

      const job = await repo.getJob(ws, jobId);
      expect(job?.counters.inserted).toBe(25);
      expect(job?.counters.failed).toBe(0);
      expect(job?.counters.duplicates).toBe(0);
      const docs = await ContactModel.find({ accountId: job?.accountId }).lean();
      expect(docs).toHaveLength(25);
      const phones = docs.map((doc) => doc.phone);
      expect(new Set(phones).size).toBe(25);
    } finally {
      await cleanup();
    }
  });

  it("replays a done chunk without changing DB state or job totals", async () => {
    const { store, cleanup } = await createTempStore();
    try {
      const ws = workspace();
      await putText(store, "source.csv", phoneCsv(contacts(5)));
      const jobId = await prepareProcessingJob(repo, ws, "source.csv", start);
      const [descriptor] = await planChunks(store, "source.csv", {
        delimiter: ",",
        rowsPerChunk: 1000,
      });
      if (!descriptor) {
        throw new Error("expected a chunk");
      }
      const ctx = { workspaceId: ws, jobId, repository: repo, store };
      const first = await processChunk(ctx, descriptor);
      const afterFirst = await repo.getJob(ws, jobId);
      const second = await processChunk(ctx, descriptor);
      const afterSecond = await repo.getJob(ws, jobId);
      expect(first.applied).toBe(true);
      expect(second.alreadyDone).toBe(true);
      expect(second.applied).toBe(false);
      expect(afterSecond?.counters).toEqual(afterFirst?.counters);
      expect(await ContactModel.countDocuments({ accountId: ws.accountId })).toBe(5);
    } finally {
      await cleanup();
    }
  });

  it("fences a late complete after another worker reclaims the lease", async () => {
    const { store, cleanup } = await createTempStore();
    try {
      const ws = workspace();
      await putText(store, "source.csv", phoneCsv(contacts(3)));
      const jobId = await prepareProcessingJob(repo, ws, "source.csv", start);
      const [descriptor] = await planChunks(store, "source.csv", { delimiter: "," });
      if (!descriptor) {
        throw new Error("expected a chunk");
      }
      const claimA = await repo.claimChunk(ws, jobId, descriptor, { leaseMs: 1 });
      expect(claimA.ok && !claimA.alreadyDone).toBe(true);
      if (!claimA.ok || claimA.alreadyDone) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 15));
      const resultB = await processChunk(
        { workspaceId: ws, jobId, repository: repo, store },
        descriptor,
      );
      expect(resultB.applied).toBe(true);
      const late = await repo.completeChunk(ws, jobId, {
        ...descriptor,
        inserted: 99,
        updated: 0,
        skipped: 0,
        failed: 0,
        duplicates: 0,
        leaseToken: claimA.leaseToken,
      });
      expect(late.applied).toBe(false);
      const job = await repo.getJob(ws, jobId);
      expect(job?.counters.inserted).toBe(3);
      expect(job?.counters.inserted).not.toBe(99);
    } finally {
      await cleanup();
    }
  });

  it("treats concurrent other-identity E11000 as duplicates, not failures", async () => {
    const { store, cleanup } = await createTempStore();
    try {
      const ws = workspace();
      await putText(
        store,
        "a.csv",
        phoneCsv([
          { name: "A1", phone: indianPhone(1), email: "shared@kyra.test" },
          { name: "A2", phone: indianPhone(2), email: "a2@kyra.test" },
        ]),
      );
      await putText(
        store,
        "b.csv",
        phoneCsv([
          { name: "B1", phone: indianPhone(3), email: "shared@kyra.test" },
          { name: "B2", phone: indianPhone(4), email: "b2@kyra.test" },
        ]),
      );
      const jobA = await prepareProcessingJob(repo, ws, "a.csv", start);
      const jobB = await prepareProcessingJob(repo, ws, "b.csv", start);
      const [chunkA] = await planChunks(store, "a.csv", { delimiter: "," });
      const [chunkB] = await planChunks(store, "b.csv", { delimiter: "," });
      if (!chunkA || !chunkB) {
        throw new Error("expected chunks");
      }
      await Promise.all([
        processChunk({ workspaceId: ws, jobId: jobA, repository: repo, store }, chunkA),
        processChunk({ workspaceId: ws, jobId: jobB, repository: repo, store }, chunkB),
      ]);
      const count = await ContactModel.countDocuments({ accountId: ws.accountId });
      expect(count).toBe(3);
      const jobs = await Promise.all([repo.getJob(ws, jobA), repo.getJob(ws, jobB)]);
      const failed = (jobs[0]?.counters.failed ?? 0) + (jobs[1]?.counters.failed ?? 0);
      const duplicates =
        (jobs[0]?.counters.duplicates ?? 0) + (jobs[1]?.counters.duplicates ?? 0);
      expect(failed).toBe(0);
      expect(duplicates).toBe(1);
    } finally {
      await cleanup();
    }
  });
});
