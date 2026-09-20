import {
  IMPORT_SSE_HEARTBEAT_MS,
  IMPORT_SSE_MAX_CONNECTIONS_PER_USER,
  IMPORT_SSE_POLL_MS,
} from "../constants/import.constant.js";
import type { ContactImportJobRecord } from "../types/import.types.js";
import type { ContactImportRepository } from "../repositories/contact-import.repository.js";
import { IMPORT_STATUS } from "../constants/import.constant.js";

export type SseSnapshot = Pick<
  ContactImportJobRecord,
  "id" | "status" | "counters" | "totalRows" | "updatedAt" | "errorMessage"
>;

export interface SseSubscriber {
  sendSnapshot(job: SseSnapshot): void;
  heartbeat(): void;
  close(): void;
}

interface JobPoller {
  refs: number;
  timer: ReturnType<typeof setInterval>;
  lastFingerprint: string;
  subscribers: Set<SseSubscriber>;
}

const TERMINAL = new Set<string>([
  IMPORT_STATUS.COMPLETED,
  IMPORT_STATUS.COMPLETED_WITH_ERRORS,
  IMPORT_STATUS.FAILED,
  IMPORT_STATUS.CANCELLED,
]);

export class ImportSseHub {
  private readonly pollers = new Map<string, JobPoller>();
  private readonly userConnections = new Map<string, number>();

  constructor(
    private readonly repository: ContactImportRepository,
    private readonly pollMs = IMPORT_SSE_POLL_MS,
    private readonly heartbeatMs = IMPORT_SSE_HEARTBEAT_MS,
    private readonly maxPerUser = IMPORT_SSE_MAX_CONNECTIONS_PER_USER,
  ) {}

  canConnect(userId: string): boolean {
    return (this.userConnections.get(userId) ?? 0) < this.maxPerUser;
  }

  subscribe(
    workspace: { organizationId: string; accountId: string },
    jobId: string,
    userId: string,
    subscriber: SseSubscriber,
  ): () => void {
    if (!this.canConnect(userId)) {
      throw new Error("SSE_CONNECTION_LIMIT");
    }
    this.userConnections.set(userId, (this.userConnections.get(userId) ?? 0) + 1);
    const key = `${workspace.organizationId}:${workspace.accountId}:${jobId}`;
    let poller = this.pollers.get(key);
    if (!poller) {
      poller = {
        refs: 0,
        lastFingerprint: "",
        subscribers: new Set(),
        timer: setInterval(() => {
          void this.tick(workspace, jobId, key);
        }, this.pollMs),
      };
      this.pollers.set(key, poller);
      void this.tick(workspace, jobId, key);
    }
    poller.refs += 1;
    poller.subscribers.add(subscriber);
    const heartbeat = setInterval(() => subscriber.heartbeat(), this.heartbeatMs);
    return () => {
      clearInterval(heartbeat);
      const current = this.pollers.get(key);
      if (current) {
        current.subscribers.delete(subscriber);
        current.refs -= 1;
        if (current.refs <= 0) {
          clearInterval(current.timer);
          this.pollers.delete(key);
        }
      }
      const next = (this.userConnections.get(userId) ?? 1) - 1;
      if (next <= 0) {
        this.userConnections.delete(userId);
      } else {
        this.userConnections.set(userId, next);
      }
    };
  }

  activePollers(): number {
    return this.pollers.size;
  }

  private async tick(
    workspace: { organizationId: string; accountId: string },
    jobId: string,
    key: string,
  ): Promise<void> {
    const poller = this.pollers.get(key);
    if (!poller) {
      return;
    }
    const job = await this.repository.getJob(workspace, jobId);
    if (!job) {
      return;
    }
    const snapshot: SseSnapshot = {
      id: job.id,
      status: job.status,
      counters: job.counters,
      totalRows: job.totalRows,
      updatedAt: job.updatedAt,
      errorMessage: job.errorMessage,
    };
    const fingerprint = [
      job.status,
      job.counters.processed,
      job.counters.inserted,
      job.counters.updated,
      job.counters.failed,
      job.counters.skipped,
      job.totalRows ?? "",
    ].join(":");
    if (fingerprint !== poller.lastFingerprint) {
      poller.lastFingerprint = fingerprint;
      for (const subscriber of poller.subscribers) {
        subscriber.sendSnapshot(snapshot);
      }
    }
    if (TERMINAL.has(job.status)) {
      for (const subscriber of poller.subscribers) {
        subscriber.close();
      }
    }
  }
}
