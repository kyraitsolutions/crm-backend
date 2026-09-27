export const IMPORT_QUEUE_NAME = "contact-import";

export const IMPORT_JOB_NAME = {
  VALIDATE: "import:validate",
  CHUNK: "import:chunk",
  FINALIZE: "import:finalize",
  SWEEP: "import:sweep",
  CLEANUP: "import:cleanup",
} as const;

export type ImportJobName = (typeof IMPORT_JOB_NAME)[keyof typeof IMPORT_JOB_NAME];

export interface EnqueueOptions {
  jobId: string;
  delayMs?: number;
  attempts?: number;
}

export interface RepeatableJobOptions {
  jobId: string;
  everyMs?: number;
  cron?: string;
}

export interface QueueJob {
  id: string;
  name: string;
  data: Record<string, unknown>;
  attemptsMade: number;
  heartbeat?: () => Promise<void>;
}

export interface QueuePort {
  enqueue(
    name: string,
    data: Record<string, unknown>,
    options: EnqueueOptions,
  ): Promise<boolean>;
  process(
    name: string,
    concurrency: number,
    handler: (job: QueueJob) => Promise<void>,
  ): void;
  remove(jobId: string): Promise<boolean>;
  addRepeatable(
    name: string,
    data: Record<string, unknown>,
    options: RepeatableJobOptions,
  ): Promise<boolean>;
  listRepeatableJobIds(): Promise<string[]>;
  pause(): Promise<void>;
  close(): Promise<void>;
}

export interface ValidateJobData {
  jobId: string;
  organizationId: string;
  accountId: string;
}

export interface ChunkJobData extends ValidateJobData {
  index: number;
}

export interface FinalizeJobData extends ValidateJobData {}

export function validateJobId(jobId: string): string {
  return `validate-${jobId}`;
}

export function chunkJobId(jobId: string, index: number): string {
  return `chunk-${jobId}-${index}`;
}

export function finalizeJobId(jobId: string): string {
  return `finalize-${jobId}`;
}

export const SWEEP_REPEAT_JOB_ID = "contact-import-sweep";
export const CLEANUP_REPEAT_JOB_ID = "contact-import-cleanup";
