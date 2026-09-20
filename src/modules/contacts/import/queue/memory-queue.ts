import { IMPORT_CHUNK_ATTEMPTS } from "../constants/import.constant.js";
import { isTransientError } from "../errors/import-worker.errors.js";
import type {
  EnqueueOptions,
  QueueJob,
  QueuePort,
  RepeatableJobOptions,
} from "./queue-port.js";

type JobHandler = (job: QueueJob) => Promise<void>;

interface StoredJob extends QueueJob {
  attempts: number;
  availableAt: number;
}

export class MemoryQueue implements QueuePort {
  private readonly handlers = new Map<string, JobHandler>();
  private readonly jobs = new Map<string, StoredJob>();
  private readonly pending: string[] = [];
  private readonly active = new Set<string>();
  private readonly generations = new Map<string, number>();
  private readonly repeatables = new Map<string, RepeatableJobOptions>();
  private paused = false;
  readonly processed: string[] = [];
  readonly retryAt: number[] = [];
  onProcessed?: (job: QueueJob) => void;

  constructor(private readonly backoffBaseMs = 0) {}

  async enqueue(
    name: string,
    data: Record<string, unknown>,
    options: EnqueueOptions,
  ): Promise<boolean> {
    if (this.jobs.has(options.jobId) || this.active.has(options.jobId)) {
      return false;
    }
    const job: StoredJob = {
      id: options.jobId,
      name,
      data,
      attemptsMade: 0,
      attempts: options.attempts ?? IMPORT_CHUNK_ATTEMPTS,
      availableAt: Date.now() + (options.delayMs ?? 0),
    };
    this.jobs.set(options.jobId, job);
    this.pending.push(options.jobId);
    return true;
  }

  process(name: string, _concurrency: number, handler: JobHandler): void {
    this.handlers.set(name, handler);
  }

  async remove(jobId: string): Promise<boolean> {
    if (this.active.has(jobId)) {
      return false;
    }
    if (!this.jobs.has(jobId)) {
      return false;
    }
    const pendingIndex = this.pending.indexOf(jobId);
    if (pendingIndex >= 0) {
      this.pending.splice(pendingIndex, 1);
    }
    this.jobs.delete(jobId);
    return true;
  }

  async addRepeatable(
    _name: string,
    _data: Record<string, unknown>,
    options: RepeatableJobOptions,
  ): Promise<boolean> {
    if (this.repeatables.has(options.jobId)) {
      return false;
    }
    this.repeatables.set(options.jobId, options);
    return true;
  }

  async listRepeatableJobIds(): Promise<string[]> {
    return [...this.repeatables.keys()];
  }

  async pause(): Promise<void> {
    this.paused = true;
  }

  async close(): Promise<void> {
    this.paused = true;
    this.pending.length = 0;
    this.jobs.clear();
    this.active.clear();
    this.repeatables.clear();
  }

  async drain(maxJobs = 100_000): Promise<void> {
    let ran = 0;
    while (!this.paused) {
      if (ran >= maxJobs) {
        throw new Error("MemoryQueue drain exceeded safety cap");
      }
      const id = this.nextReadyJobId();
      if (id !== undefined) {
        await this.run(id);
        ran += 1;
        continue;
      }
      const nextAt = this.nextDelayedAt();
      if (nextAt === undefined) {
        break;
      }
      const waitMs = Math.max(0, nextAt - Date.now());
      await sleep(waitMs);
    }
  }

  async deliver(jobId: string): Promise<void> {
    await this.run(jobId);
  }

  async deliverTwice(jobId: string): Promise<void> {
    await this.run(jobId);
    await this.run(jobId);
  }

  loseAll(): void {
    this.pending.length = 0;
    this.jobs.clear();
    this.active.clear();
  }

  pendingCount(): number {
    return this.pending.length;
  }

  /**
   * Simulates a SIGKILL: the in-flight handler's result is discarded and the
   * job is put back on the waiting list so a later drain redelivers it.
   */
  killActive(): string[] {
    const killed = [...this.active];
    for (const jobId of killed) {
      this.generations.set(jobId, (this.generations.get(jobId) ?? 0) + 1);
      this.active.delete(jobId);
      if (!this.pending.includes(jobId) && this.jobs.has(jobId)) {
        const job = this.jobs.get(jobId);
        if (job) {
          job.availableAt = Date.now();
        }
        this.pending.push(jobId);
      }
    }
    return killed;
  }

  private nextDelayedAt(): number | undefined {
    let earliest: number | undefined;
    for (const id of this.pending) {
      const job = this.jobs.get(id);
      if (!job) {
        continue;
      }
      if (earliest === undefined || job.availableAt < earliest) {
        earliest = job.availableAt;
      }
    }
    return earliest;
  }

  private nextReadyJobId(): string | undefined {
    const now = Date.now();
    const index = this.pending.findIndex((id) => {
      const job = this.jobs.get(id);
      return job !== undefined && job.availableAt <= now;
    });
    if (index < 0) {
      return undefined;
    }
    return this.pending.splice(index, 1)[0];
  }

  private async run(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return;
    }
    const handler = this.handlers.get(job.name);
    if (!handler) {
      throw new Error(`No handler registered for ${job.name}`);
    }
    const generation = this.generations.get(jobId) ?? 0;
    this.active.add(jobId);
    try {
      await handler(job);
      if ((this.generations.get(jobId) ?? 0) !== generation) {
        return;
      }
      this.jobs.delete(jobId);
      this.processed.push(jobId);
      this.onProcessed?.(job);
    } catch (error) {
      if ((this.generations.get(jobId) ?? 0) !== generation) {
        return;
      }
      if (isTransientError(error) && job.attemptsMade + 1 < job.attempts) {
        job.attemptsMade += 1;
        const delay = this.backoffBaseMs * 2 ** Math.max(0, job.attemptsMade - 1);
        job.availableAt = Date.now() + delay;
        this.retryAt.push(job.availableAt);
        this.pending.push(jobId);
        return;
      }
      this.jobs.delete(jobId);
      throw error;
    } finally {
      this.active.delete(jobId);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
