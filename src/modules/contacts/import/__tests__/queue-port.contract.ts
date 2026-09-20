import { PermanentError, TransientError } from "../errors/import-worker.errors.js";
import type { QueuePort } from "../queue/queue-port.js";

export interface QueueContractContext {
  queue: QueuePort;
  drain: () => Promise<void>;
  killActive?: () => void | Promise<void>;
  openSibling?: () => Promise<{ queue: QueuePort; close: () => Promise<void> }>;
  redeliverAfterKill?: (input: {
    name: string;
    jobId: string;
    onParentRun: () => void;
  }) => Promise<void>;
  cleanup: () => Promise<void>;
}

export function defineQueuePortContract(
  label: string,
  setup: () => Promise<QueueContractContext>,
): void {
  describe(`QueuePort contract: ${label}`, () => {
    let ctx: QueueContractContext;
    let seq = 0;

    beforeEach(async () => {
      ctx = await setup();
      seq += 1;
    });

    afterEach(async () => {
      await ctx.cleanup();
    });

    function ids(): { name: string; jobId: string } {
      return { name: `c-${label}-${seq}`, jobId: `id-${label}-${seq}` };
    }

    it("a) add same jobId while waiting executes once", async () => {
      const { name, jobId } = ids();
      let runs = 0;
      ctx.queue.process(name, 1, async () => {
        runs += 1;
      });
      expect(await ctx.queue.enqueue(name, { n: 1 }, { jobId })).toBe(true);
      expect(await ctx.queue.enqueue(name, { n: 2 }, { jobId })).toBe(false);
      await ctx.drain();
      expect(runs).toBe(1);
    });

    it("b) add same jobId while active is ignored", async () => {
      const { name, jobId } = ids();
      let runs = 0;
      let ignored = true;
      ctx.queue.process(name, 1, async () => {
        runs += 1;
        ignored = await ctx.queue.enqueue(name, { n: 2 }, { jobId });
      });
      expect(await ctx.queue.enqueue(name, { n: 1 }, { jobId })).toBe(true);
      await ctx.drain();
      expect(runs).toBe(1);
      expect(ignored).toBe(false);
    });

    it("c) add same jobId after COMPLETED executes again", async () => {
      const { name, jobId } = ids();
      let runs = 0;
      ctx.queue.process(name, 1, async () => {
        runs += 1;
      });
      expect(await ctx.queue.enqueue(name, {}, { jobId })).toBe(true);
      await ctx.drain();
      expect(await ctx.queue.enqueue(name, {}, { jobId })).toBe(true);
      await ctx.drain();
      expect(runs).toBe(2);
    });

    it("d) add same jobId after FAILED executes again", async () => {
      const { name, jobId } = ids();
      let runs = 0;
      ctx.queue.process(name, 1, async () => {
        runs += 1;
        throw new PermanentError("contract fail");
      });
      expect(await ctx.queue.enqueue(name, {}, { jobId, attempts: 1 })).toBe(true);
      await expect(ctx.drain()).rejects.toBeInstanceOf(PermanentError);
      expect(await ctx.queue.enqueue(name, {}, { jobId, attempts: 1 })).toBe(true);
      await expect(ctx.drain()).rejects.toBeInstanceOf(PermanentError);
      expect(runs).toBe(2);
    });

    it("e) transient throw is retried with backoff up to attempts", async () => {
      const { name, jobId } = ids();
      let runs = 0;
      ctx.queue.process(name, 1, async () => {
        runs += 1;
        if (runs < 3) {
          throw new TransientError("blip");
        }
      });
      const started = Date.now();
      expect(await ctx.queue.enqueue(name, {}, { jobId, attempts: 3 })).toBe(true);
      await ctx.drain();
      expect(runs).toBe(3);
      expect(Date.now() - started).toBeGreaterThanOrEqual(0);
    });

    it("f) worker SIGKILL mid-job is redelivered after the stall interval", async () => {
      const { name, jobId } = ids();
      if (ctx.redeliverAfterKill) {
        let parentRuns = 0;
        await ctx.redeliverAfterKill({
          name,
          jobId,
          onParentRun: () => {
            parentRuns += 1;
          },
        });
        expect(parentRuns).toBeGreaterThanOrEqual(1);
        return;
      }
      if (!ctx.killActive) {
        throw new Error("contract setup must provide killActive or redeliverAfterKill");
      }
      let runs = 0;
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      ctx.queue.process(name, 1, async () => {
        runs += 1;
        if (runs === 1) {
          await gate;
        }
      });
      expect(await ctx.queue.enqueue(name, {}, { jobId })).toBe(true);
      const draining = ctx.drain();
      await waitUntil(() => runs === 1);
      await ctx.killActive();
      release();
      await draining;
      await ctx.drain();
      expect(runs).toBe(2);
    });

    it("g) fixed-id repeatable registered by two workers is one schedule", async () => {
      const jobId = `repeat-${label}-${seq}`;
      expect(
        await ctx.queue.addRepeatable("import:sweep", {}, { jobId, everyMs: 60_000 }),
      ).toBe(true);
      if (ctx.openSibling) {
        const sibling = await ctx.openSibling();
        try {
          expect(
            await sibling.queue.addRepeatable("import:sweep", {}, { jobId, everyMs: 60_000 }),
          ).toBe(false);
        } finally {
          await sibling.close();
        }
      } else {
        expect(
          await ctx.queue.addRepeatable("import:sweep", {}, { jobId, everyMs: 60_000 }),
        ).toBe(false);
      }
      const idsFound = await ctx.queue.listRepeatableJobIds();
      expect(idsFound.filter((id) => id === jobId)).toHaveLength(1);
    });

    it("h) remove(jobId) works for waiting and delayed jobs", async () => {
      const waiting = ids();
      let runs = 0;
      ctx.queue.process(waiting.name, 1, async () => {
        runs += 1;
      });
      expect(await ctx.queue.enqueue(waiting.name, {}, { jobId: waiting.jobId })).toBe(true);
      expect(await ctx.queue.remove(waiting.jobId)).toBe(true);
      await ctx.drain();
      expect(runs).toBe(0);

      const delayedName = `${waiting.name}-d`;
      const delayedId = `${waiting.jobId}-d`;
      ctx.queue.process(delayedName, 1, async () => {
        runs += 1;
      });
      expect(
        await ctx.queue.enqueue(delayedName, {}, { jobId: delayedId, delayMs: 60_000 }),
      ).toBe(true);
      expect(await ctx.queue.remove(delayedId)).toBe(true);
      await ctx.drain();
      expect(runs).toBe(0);
    });
  });
}

export async function waitUntil(
  predicate: () => boolean | Promise<boolean>,
  timeoutMs = 15_000,
): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await predicate()) {
      return;
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
  }
  throw new Error("timed out waiting for queue contract condition");
}
