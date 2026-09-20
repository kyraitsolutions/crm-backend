import { Types } from "mongoose";
import { ContactImportRepository } from "../repositories/contact-import.repository.js";
import type {
  CreateImportJobInput,
  ImportWorkspaceId,
} from "../types/import.types.js";
import {
  resetImportCollections,
  startImportTestMongo,
  stopImportTestMongo,
} from "./mongo-test-env.js";

const repo = new ContactImportRepository();

function workspace(): ImportWorkspaceId {
  return {
    organizationId: new Types.ObjectId().toHexString(),
    accountId: new Types.ObjectId().toHexString(),
  };
}

function createInput(
  ws: ImportWorkspaceId,
  clientRequestId?: string,
): CreateImportJobInput {
  return {
    workspaceId: ws,
    createdBy: new Types.ObjectId().toHexString(),
    clientRequestId,
    file: {
      bucket: "kyra-imports",
      key: `tenants/${ws.organizationId}/${ws.accountId}/imports/source.csv`,
      fileName: "contacts.csv",
      mimeType: "text/csv",
      byteSize: 2048,
    },
  };
}

describe("ContactImportRepository", () => {
  beforeAll(async () => {
    await startImportTestMongo();
  }, 120_000);

  afterAll(async () => {
    await stopImportTestMongo();
  });

  beforeEach(async () => {
    await resetImportCollections();
  });

  it("creates a job in uploaded and reads it only for that workspace", async () => {
    const ws = workspace();
    const job = await repo.createJob(createInput(ws));
    expect(job.status).toBe("uploaded");
    expect(job.cursor.chunkIndex).toBe(-1);
    expect(job.counters.duplicates).toBe(0);

    const found = await repo.getJob(ws, job.id);
    expect(found?.id).toBe(job.id);

    const other = await repo.getJob(workspace(), job.id);
    expect(other).toBeNull();
  });

  it("returns the existing job for the same clientRequestId", async () => {
    const ws = workspace();
    const first = await repo.createJob(createInput(ws, "req-1"));
    const second = await repo.createJob(createInput(ws, "req-1"));
    expect(second.id).toBe(first.id);
    const other = await repo.createJob(createInput(ws, "req-2"));
    expect(other.id).not.toBe(first.id);
  });

  it("lets exactly one of two concurrent transitions succeed", async () => {
    const ws = workspace();
    const job = await repo.createJob(createInput(ws));
    const [first, second] = await Promise.all([
      repo.transition(ws, job.id, "uploaded", "validating"),
      repo.transition(ws, job.id, "uploaded", "validating"),
    ]);
    const outcomes = [first, second];
    expect(outcomes.filter((item) => item.ok).length).toBe(1);
    expect(outcomes.filter((item) => !item.ok && item.reason === "conflict").length).toBe(1);
  });

  it("persists mapping and policy on mapping -> queued", async () => {
    const ws = workspace();
    const job = await repo.createJob(createInput(ws));
    await repo.transition(ws, job.id, "uploaded", "validating");
    await repo.transition(ws, job.id, "validating", "mapping");
    const queued = await repo.transition(ws, job.id, "mapping", "queued", {
      mapping: [{ source: "Phone", target: "phone", transform: "none" }],
      policy: "skip",
      defaultCountry: "IN",
    });
    expect(queued.ok).toBe(true);
    if (!queued.ok) {
      return;
    }
    expect(queued.job.policy).toBe("skip");
    expect(queued.job.mapping[0]?.source).toBe("Phone");
    expect(queued.job.defaultCountry).toBe("IN");
  });

  it("rejects illegal transitions without changing status", async () => {
    const ws = workspace();
    const job = await repo.createJob(createInput(ws));
    const result = await repo.transition(ws, job.id, "uploaded", "completed");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("illegal_transition");
    }
    const current = await repo.getJob(ws, job.id);
    expect(current?.status).toBe("uploaded");
  });

  it("does not let workspace B mutate workspace A's job", async () => {
    const wsA = workspace();
    const wsB = workspace();
    const job = await repo.createJob(createInput(wsA));
    const descriptor = {
      index: 0,
      startRow: 1,
      endRow: 10,
      byteOffsetStart: 0,
      byteOffsetEnd: 100,
    };

    const result = await repo.transition(wsB, job.id, "uploaded", "validating");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("not_found");
    }
    expect(await repo.getJob(wsB, job.id)).toBeNull();

    const claim = await repo.claimChunk(wsB, job.id, descriptor);
    expect(claim.ok).toBe(false);
    if (!claim.ok) {
      expect(claim.reason).toBe("not_found");
    }
    const completed = await repo.completeChunk(wsB, job.id, {
      ...descriptor,
      inserted: 9,
      updated: 0,
      skipped: 0,
      failed: 1,
      duplicates: 0,
      leaseToken: "none",
    });
    expect(completed.applied).toBe(false);
    if (!completed.applied) {
      expect(completed.reason).toBe("not_found");
    }
    expect(
      await repo.recordRowErrors(wsB, job.id, [
        { rowNumber: 1, reason: "INVALID_PHONE", raw: ["x"] },
      ]),
    ).toBeNull();
    expect(
      await repo.applyProgressDelta(wsB, job.id, {
        totalRows: 10,
        processed: 10,
        inserted: 9,
        updated: 0,
        skipped: 0,
        failed: 1,
        duplicates: 0,
      }),
    ).toBeNull();

    const current = await repo.getJob(wsA, job.id);
    expect(current?.status).toBe("uploaded");
    expect(current?.counters.processed).toBe(0);
    expect(current?.rowErrorPreview).toHaveLength(0);
    expect(current?.cursor.chunkIndex).toBe(-1);
  });

  it("is idempotent for completeChunk and applyProgressDelta", async () => {
    const ws = workspace();
    const job = await repo.createJob(createInput(ws));
    const descriptor = {
      index: 0,
      startRow: 1,
      endRow: 1000,
      byteOffsetStart: 0,
      byteOffsetEnd: 4000,
    };
    const claim = await repo.claimChunk(ws, job.id, descriptor);
    expect(claim.ok && !claim.alreadyDone).toBe(true);
    if (!claim.ok || claim.alreadyDone) {
      return;
    }
    const payload = {
      ...descriptor,
      inserted: 10,
      updated: 2,
      skipped: 1,
      failed: 3,
      duplicates: 4,
      leaseToken: claim.leaseToken,
    };
    const first = await repo.completeChunk(ws, job.id, payload);
    const second = await repo.completeChunk(ws, job.id, payload);
    expect(first.applied).toBe(true);
    expect(second.applied).toBe(false);
    if (first.applied) {
      expect(first.chunk.status).toBe("done");
      expect(first.chunk.duplicates).toBe(4);
      expect(first.job.counters.inserted).toBe(10);
      expect(first.job.counters.duplicates).toBe(4);
      expect(first.job.counters.processed).toBe(20);
    }
    if (!second.applied) {
      expect(second.reason).toBe("already_done");
    }
    const afterReplay = await repo.getJob(ws, job.id);
    expect(afterReplay?.counters.inserted).toBe(10);
    expect(afterReplay?.counters.processed).toBe(20);

    const snapshot = {
      totalRows: 5000,
      processed: 1000,
      inserted: 10,
      updated: 2,
      skipped: 1,
      failed: 3,
      duplicates: 4,
    };
    const progressOne = await repo.applyProgressDelta(ws, job.id, snapshot);
    const progressTwo = await repo.applyProgressDelta(ws, job.id, snapshot);
    expect(progressTwo?.counters).toEqual(progressOne?.counters);
    expect(progressTwo?.cursor.chunkIndex).toBe(0);
    expect(progressTwo?.cursor.rowNumber).toBe(1000);
  });

  it("rejects a late complete after the lease is reclaimed", async () => {
    const ws = workspace();
    const job = await repo.createJob(createInput(ws));
    const descriptor = {
      index: 0,
      startRow: 1,
      endRow: 10,
      byteOffsetStart: 0,
      byteOffsetEnd: 100,
    };
    const first = await repo.claimChunk(ws, job.id, descriptor, { leaseMs: 1 });
    expect(first.ok && !first.alreadyDone).toBe(true);
    if (!first.ok || first.alreadyDone) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 15));
    const second = await repo.claimChunk(ws, job.id, descriptor, { leaseMs: 60_000 });
    expect(second.ok && !second.alreadyDone).toBe(true);
    if (!second.ok || second.alreadyDone) {
      return;
    }

    const late = await repo.completeChunk(ws, job.id, {
      ...descriptor,
      inserted: 99,
      updated: 0,
      skipped: 0,
      failed: 0,
      duplicates: 0,
      leaseToken: first.leaseToken,
    });
    expect(late.applied).toBe(false);
    if (!late.applied) {
      expect(late.reason).toBe("lease_mismatch");
    }

    const winner = await repo.completeChunk(ws, job.id, {
      ...descriptor,
      inserted: 7,
      updated: 0,
      skipped: 0,
      failed: 0,
      duplicates: 0,
      leaseToken: second.leaseToken,
    });
    expect(winner.applied).toBe(true);
    const current = await repo.getJob(ws, job.id);
    expect(current?.counters.inserted).toBe(7);
  });

  it("extends a live lease via heartbeat", async () => {
    const ws = workspace();
    const job = await repo.createJob(createInput(ws));
    const descriptor = {
      index: 0,
      startRow: 1,
      endRow: 10,
      byteOffsetStart: 0,
      byteOffsetEnd: 100,
    };
    const claim = await repo.claimChunk(ws, job.id, descriptor, { leaseMs: 30 });
    expect(claim.ok && !claim.alreadyDone).toBe(true);
    if (!claim.ok || claim.alreadyDone) {
      return;
    }
    const extended = await repo.heartbeat(ws, job.id, 0, claim.leaseToken, { leaseMs: 60_000 });
    expect(extended).toBe(true);
    const stolen = await repo.claimChunk(ws, job.id, descriptor);
    expect(stolen.ok).toBe(false);
    if (!stolen.ok) {
      expect(stolen.reason).toBe("leased");
    }
  });

  it("merges row errors by row number and caps the preview", async () => {
    const ws = workspace();
    const job = await repo.createJob(createInput(ws));
    const many = Array.from({ length: 120 }, (_, index) => ({
      rowNumber: index + 1,
      reason: "INVALID_PHONE",
      raw: ["x"],
    }));
    await repo.recordRowErrors(ws, job.id, many);
    const first = await repo.recordRowErrors(ws, job.id, many);
    expect(first?.rowErrorPreview).toHaveLength(100);
    expect(first?.rowErrorPreview[0]?.rowNumber).toBe(1);

    const updated = await repo.recordRowErrors(ws, job.id, [
      { rowNumber: 1, reason: "INVALID_EMAIL", raw: ["y"] },
    ]);
    expect(updated?.rowErrorPreview[0]?.reason).toBe("INVALID_EMAIL");
    expect(updated?.rowErrorPreview).toHaveLength(100);
  });

  it("applies completeChunk totals when chunks finish 3, 1, 2 out of order", async () => {
    const ws = workspace();
    const job = await repo.createJob(createInput(ws));
    const specs = [
      { index: 1, inserted: 10, failed: 1 },
      { index: 2, inserted: 20, failed: 2 },
      { index: 3, inserted: 30, failed: 3 },
    ];
    const tokens = new Map<number, string>();
    for (const spec of specs) {
      const claim = await repo.claimChunk(ws, job.id, {
        index: spec.index,
        startRow: spec.index * 10,
        endRow: spec.index * 10 + 9,
        byteOffsetStart: spec.index * 100,
        byteOffsetEnd: spec.index * 100 + 50,
      });
      expect(claim.ok && !claim.alreadyDone).toBe(true);
      if (!claim.ok || claim.alreadyDone) {
        return;
      }
      tokens.set(spec.index, claim.leaseToken);
    }
    for (const index of [3, 1, 2]) {
      const spec = specs.find((item) => item.index === index);
      const leaseToken = tokens.get(index);
      if (!spec || !leaseToken) {
        throw new Error("missing spec");
      }
      const completed = await repo.completeChunk(ws, job.id, {
        index,
        startRow: index * 10,
        endRow: index * 10 + 9,
        byteOffsetStart: index * 100,
        byteOffsetEnd: index * 100 + 50,
        inserted: spec.inserted,
        updated: 0,
        skipped: 0,
        failed: spec.failed,
        duplicates: 0,
        leaseToken,
      });
      expect(completed.applied).toBe(true);
    }
    const current = await repo.getJob(ws, job.id);
    expect(current?.counters.inserted).toBe(60);
    expect(current?.counters.failed).toBe(6);
    expect(current?.counters.processed).toBe(66);
  });

  it("recovers exact job totals after a crash between chunk-done and $inc", async () => {
    const ws = workspace();
    const job = await repo.createJob(createInput(ws));
    await repo.transition(ws, job.id, "uploaded", "validating");
    await repo.transition(ws, job.id, "validating", "mapping");
    await repo.transition(ws, job.id, "mapping", "queued");
    await repo.transition(ws, job.id, "queued", "processing");
    const descriptor = {
      index: 0,
      startRow: 1,
      endRow: 20,
      byteOffsetStart: 0,
      byteOffsetEnd: 400,
    };
    const claim = await repo.claimChunk(ws, job.id, descriptor);
    expect(claim.ok && !claim.alreadyDone).toBe(true);
    if (!claim.ok || claim.alreadyDone) {
      return;
    }
    const done = await repo.completeChunk(
      ws,
      job.id,
      {
        ...descriptor,
        inserted: 17,
        updated: 0,
        skipped: 0,
        failed: 3,
        duplicates: 0,
        leaseToken: claim.leaseToken,
      },
      { applyJobTotals: false },
    );
    expect(done.applied).toBe(true);
    const crashed = await repo.getJob(ws, job.id);
    expect(crashed?.counters.inserted).toBe(0);
    expect(crashed?.counters.processed).toBe(0);
    const chunk = await repo.getChunk(ws, job.id, 0);
    expect(chunk?.status).toBe("done");
    expect(chunk?.totalsApplied).toBe(false);

    const { handleSweep } = await import("../handlers/sweeper.handler.js");
    const { handleFinalize } = await import("../handlers/finalize.handler.js");
    const { MemoryQueue } = await import("../queue/memory-queue.js");
    const { defaultRuntimeSettings } = await import("../config/import-env.js");
    const queue = new MemoryQueue();
    const deps = {
      repository: repo,
      store: {
        createReadStream: async () => {
          throw new Error("unused");
        },
        putStream: async () => undefined,
        exists: async () => false,
        delete: async () => undefined,
        size: async () => 0,
      },
      queue,
      settings: defaultRuntimeSettings(),
    };
    await handleSweep(deps);
    const afterSweep = await repo.getJob(ws, job.id);
    expect(afterSweep?.counters.inserted).toBe(17);
    expect(afterSweep?.counters.failed).toBe(3);
    expect(afterSweep?.counters.processed).toBe(20);
    const applied = await repo.getChunk(ws, job.id, 0);
    expect(applied?.totalsApplied).toBe(true);

    await handleFinalize(deps, ws, job.id);
    const finalJob = await repo.getJob(ws, job.id);
    expect(finalJob?.counters.inserted).toBe(17);
    expect(finalJob?.counters.failed).toBe(3);
    expect(finalJob?.counters.processed).toBe(20);
    expect(finalJob?.status).toBe("completed_with_errors");
  });

  it("releases a claimed chunk back to pending and clears the lease", async () => {
    const ws = workspace();
    const job = await repo.createJob(createInput(ws));
    const descriptor = {
      index: 0,
      startRow: 1,
      endRow: 10,
      byteOffsetStart: 0,
      byteOffsetEnd: 40,
    };
    const claim = await repo.claimChunk(ws, job.id, descriptor);
    expect(claim.ok && !claim.alreadyDone).toBe(true);
    if (!claim.ok || claim.alreadyDone) {
      return;
    }
    const released = await repo.releaseChunk(ws, job.id, 0, claim.leaseToken, "transient");
    expect(released).toBe(true);
    const chunk = await repo.getChunk(ws, job.id, 0);
    expect(chunk?.status).toBe("pending");
    expect(chunk?.leaseToken).toBeUndefined();
    expect(chunk?.lastError).toBe("transient");
  });

  it("does not apply a smaller progress snapshot", async () => {
    const ws = workspace();
    const job = await repo.createJob(createInput(ws));
    await repo.applyProgressDelta(ws, job.id, {
      totalRows: 100,
      processed: 80,
      inserted: 70,
      updated: 5,
      skipped: 3,
      failed: 2,
      duplicates: 1,
    });
    const lowered = await repo.applyProgressDelta(ws, job.id, {
      totalRows: 10,
      processed: 1,
      inserted: 1,
      updated: 0,
      skipped: 0,
      failed: 0,
      duplicates: 0,
    });
    expect(lowered?.counters.processed).toBe(80);
    expect(lowered?.counters.inserted).toBe(70);
    expect(lowered?.counters.duplicates).toBe(1);
  });
});
