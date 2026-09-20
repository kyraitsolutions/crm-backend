import { spawn } from "node:child_process";
import { newIntegrationRunIds } from "../integration-safety.js";
import { defineQueuePortContract, waitUntil } from "../queue-port.contract.js";
import {
  childPath,
  createTestBullQueue,
  requireIntegrationEnv,
  tsxCliPath,
} from "./helpers.js";

const enabled = Boolean(process.env.REDIS_URL);

const describeBull = enabled ? describe : describe.skip;

describeBull("QueuePort contract on real Bull", () => {
  requireIntegrationEnv();

  defineQueuePortContract("Bull", async () => {
    const ids = newIntegrationRunIds();
    const queue = createTestBullQueue(ids, {
      lockDurationMs: 2_000,
      stalledIntervalMs: 1_000,
      backoffBaseMs: 40,
    });

    const drain = async (): Promise<void> => {
      let terminalFailure: unknown;
      const onFailed = (job: { attemptsMade: number; opts: { attempts?: number } }, err: Error) => {
        const attempts = job.opts.attempts ?? 1;
        if (job.attemptsMade >= attempts) {
          terminalFailure = err;
        }
      };
      const onCompleted = (): void => {
        terminalFailure = undefined;
      };
      queue.queue.on("failed", onFailed);
      queue.queue.on("completed", onCompleted);
      try {
        const started = Date.now();
        while (Date.now() - started < 20_000) {
          const counts = await queue.queue.getJobCounts();
          const inflight =
            (counts.waiting ?? 0) +
            (counts.active ?? 0) +
            (counts.delayed ?? 0) +
            (counts.paused ?? 0);
          if (inflight === 0) {
            if (terminalFailure instanceof Error) {
              throw terminalFailure;
            }
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 40));
        }
        throw new Error("Bull drain timed out");
      } finally {
        queue.queue.off("failed", onFailed);
        queue.queue.off("completed", onCompleted);
      }
    };

    return {
      queue,
      drain,
      openSibling: async () => {
        const sibling = createTestBullQueue(ids, {
          lockDurationMs: 2_000,
          stalledIntervalMs: 1_000,
          backoffBaseMs: 40,
        });
        return {
          queue: sibling,
          close: async () => {
            await sibling.close();
          },
        };
      },
      redeliverAfterKill: async ({ name, jobId, onParentRun }) => {
        const child = spawn(process.execPath, [tsxCliPath(), childPath("stall-worker-child.ts")], {
          env: {
            ...process.env,
            IMPORT_QUEUE_NAME: ids.queueName,
            IMPORT_BULL_PREFIX: ids.bullPrefix,
            IMPORT_STALL_JOB_NAME: name,
            IMPORT_LOCK_MS: "2000",
            IMPORT_STALL_INTERVAL_MS: "1000",
          },
          stdio: ["ignore", "pipe", "pipe"],
        });
        try {
          await waitForChildText(child, "READY", 15_000);
          const added = await queue.enqueue(name, {}, { jobId, attempts: 2 });
          if (!added) {
            throw new Error("failed to enqueue stall job");
          }
          await waitUntil(async () => (await queue.queue.getActiveCount()) > 0, 10_000);
          child.kill("SIGKILL");
          queue.process(name, 1, async () => {
            onParentRun();
          });
          await drain();
        } finally {
          if (!child.killed) {
            child.kill("SIGKILL");
          }
        }
      },
      cleanup: async () => {
        await queue.obliterate().catch(() => undefined);
        await queue.close().catch(() => undefined);
      },
    };
  });
});

function waitForChildText(
  child: ReturnType<typeof spawn>,
  token: string,
  timeoutMs: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.off("exit", onExit);
      reject(new Error(`child did not emit ${token}`));
    }, timeoutMs);
    let buf = "";
    const onExit = (code: number | null): void => {
      clearTimeout(timer);
      reject(new Error(`child exited ${code} before ${token}: ${buf}`));
    };
    child.stdout?.on("data", (chunk: Buffer) => {
      buf += chunk.toString("utf8");
      if (buf.includes(token)) {
        clearTimeout(timer);
        child.off("exit", onExit);
        resolve();
      }
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      buf += chunk.toString("utf8");
    });
    child.on("exit", onExit);
  });
}
