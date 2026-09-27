import Queue from "bull";
import { createBullClient } from "../../../../config/redis.config.js";
import {
  IMPORT_BACKOFF_BASE_MS,
  IMPORT_CHUNK_ATTEMPTS,
} from "../constants/import.constant.js";
import type {
  EnqueueOptions,
  QueueJob,
  QueuePort,
  RepeatableJobOptions,
} from "./queue-port.js";
import { IMPORT_QUEUE_NAME } from "./queue-port.js";

export interface BullQueueOptions {
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  lockDurationMs: number;
  attempts?: number;
  backoffBaseMs?: number;
  queueName?: string;
  prefix?: string;
  stalledIntervalMs?: number;
}

const TERMINAL_STATES = new Set(["completed", "failed"]);
const REMOVABLE_STATES = new Set(["waiting", "delayed", "paused"]);

export class BullImportQueue implements QueuePort {
  readonly queue: Queue.Queue;
  readonly queueName: string;
  readonly prefix: string;
  private readonly lockDurationMs: number;

  constructor(options: BullQueueOptions) {
    const attempts = options.attempts ?? IMPORT_CHUNK_ATTEMPTS;
    const backoffBaseMs = options.backoffBaseMs ?? IMPORT_BACKOFF_BASE_MS;
    this.queueName = options.queueName ?? IMPORT_QUEUE_NAME;
    this.prefix = options.prefix ?? "bull";
    this.lockDurationMs = options.lockDurationMs;
    const stalledInterval = options.stalledIntervalMs ?? Math.max(
      5_000,
      Math.floor(options.lockDurationMs / 2),
    );
    this.queue = new Queue(this.queueName, {
      prefix: this.prefix,
      redis: {
        host: options.redis.host,
        port: options.redis.port,
        password: options.redis.password,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      },
      createClient: createBullClient,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
        attempts,
        backoff: {
          type: "exponentialJitter",
          delay: backoffBaseMs,
        },
      },
      settings: {
        lockDuration: options.lockDurationMs,
        lockRenewTime: Math.max(1_000, Math.floor(options.lockDurationMs / 3)),
        stalledInterval,
        maxStalledCount: 10,
        backoffStrategies: {
          exponentialJitter: (attemptsMade: number) => {
            const exp = backoffBaseMs * 2 ** Math.max(0, attemptsMade - 1);
            const jitter = Math.floor(Math.random() * exp * 0.25);
            return exp + jitter;
          },
        },
      },
    });
  }

  async enqueue(
    name: string,
    data: Record<string, unknown>,
    options: EnqueueOptions,
  ): Promise<boolean> {
    const existing = await this.queue.getJob(options.jobId);
    if (existing) {
      const state = await existing.getState();
      if (TERMINAL_STATES.has(state)) {
        await existing.remove();
      } else {
        return false;
      }
    }
    try {
      await this.queue.add(name, data, {
        jobId: options.jobId,
        delay: options.delayMs,
        attempts: options.attempts,
        removeOnComplete: true,
        removeOnFail: true,
      });
      return true;
    } catch (error) {
      if (isDuplicateJobError(error)) {
        return false;
      }
      throw error;
    }
  }

  process(
    name: string,
    concurrency: number,
    handler: (job: QueueJob) => Promise<void>,
  ): void {
    void this.queue.process(name, concurrency, async (job) => {
      await handler({
        id: String(job.id),
        name: job.name,
        data: asRecord(job.data),
        attemptsMade: job.attemptsMade,
        heartbeat: async () => {
          await job.extendLock(this.lockDurationMs);
        },
      });
    });
  }

  async remove(jobId: string): Promise<boolean> {
    const job = await this.queue.getJob(jobId);
    if (!job) {
      return false;
    }
    const state = await job.getState();
    if (!REMOVABLE_STATES.has(state)) {
      return false;
    }
    await job.remove();
    return true;
  }

  async addRepeatable(
    name: string,
    data: Record<string, unknown>,
    options: RepeatableJobOptions,
  ): Promise<boolean> {
    const existing = await this.queue.getRepeatableJobs();
    if (existing.some((job) => job.id === options.jobId)) {
      return false;
    }
    const repeat = options.cron
      ? { cron: options.cron }
      : { every: options.everyMs ?? 60_000 };
    await this.queue.add(name, data, {
      jobId: options.jobId,
      repeat,
    });
    return true;
  }

  async listRepeatableJobIds(): Promise<string[]> {
    const jobs = await this.queue.getRepeatableJobs();
    return jobs
      .map((job) => job.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);
  }

  async pause(): Promise<void> {
    await this.queue.pause(true);
  }

  async close(): Promise<void> {
    await this.queue.close();
  }

  async obliterate(): Promise<void> {
    await this.queue.obliterate({ force: true });
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function isDuplicateJobError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.message.includes("already exists") || error.message.includes("Job already");
}
