import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { Readable } from "node:stream";
import { PermanentError, TransientError } from "../errors/import-worker.errors.js";
import type { FileReadRange, FileStore } from "./file-store.js";

export interface S3FileStoreOptions {
  client: S3Client;
  bucket: string;
  maxAttempts?: number;
}

export class S3FileStore implements FileStore {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly maxAttempts: number;

  constructor(options: S3FileStoreOptions) {
    this.client = options.client;
    this.bucket = options.bucket;
    this.maxAttempts = options.maxAttempts ?? 4;
  }

  async createReadStream(key: string, range: FileReadRange = {}): Promise<Readable> {
    assertSafeKey(key);
    return this.retry(key, async () => {
      const result = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Range: formatRange(range),
        }),
      );
      const body = result.Body;
      if (body instanceof Readable) {
        return body;
      }
      throw new TransientError(`S3 body missing for ${key}`, "IMPORT_S3_TRANSIENT");
    });
  }

  async putStream(key: string, stream: Readable): Promise<void> {
    assertSafeKey(key);
    try {
      const upload = new Upload({
        client: this.client,
        params: {
          Bucket: this.bucket,
          Key: key,
          Body: stream,
        },
      });
      await upload.done();
    } catch (error) {
      throw classifyS3Error(error, key);
    }
  }

  async exists(key: string): Promise<boolean> {
    assertSafeKey(key);
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch (error) {
      if (isS3NotFound(error)) {
        return false;
      }
      throw classifyS3Error(error, key);
    }
  }

  async delete(key: string): Promise<void> {
    assertSafeKey(key);
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (error) {
      if (isS3NotFound(error)) {
        return;
      }
      throw classifyS3Error(error, key);
    }
  }

  async size(key: string): Promise<number> {
    assertSafeKey(key);
    try {
      const result = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      if (typeof result.ContentLength !== "number") {
        throw new PermanentError(`Object not found: ${key}`, "IMPORT_NOT_FOUND");
      }
      return result.ContentLength;
    } catch (error) {
      throw classifyS3Error(error, key);
    }
  }

  private async retry<T>(key: string, operation: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < this.maxAttempts; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        const classified = classifyS3Error(error, key);
        if (classified instanceof PermanentError) {
          throw classified;
        }
        lastError = classified;
        const backoff = 100 * 2 ** attempt + Math.floor(Math.random() * 50);
        await sleep(backoff);
      }
    }
    throw classifyS3Error(lastError, key);
  }
}

function formatRange(range: FileReadRange): string | undefined {
  if (range.start === undefined && range.end === undefined) {
    return undefined;
  }
  const start = range.start ?? 0;
  if (range.end === undefined) {
    return `bytes=${start}-`;
  }
  return `bytes=${start}-${range.end}`;
}

function assertSafeKey(key: string): void {
  if (!key || key.includes("\0") || key.split("/").includes("..")) {
    throw new PermanentError("Invalid storage key", "IMPORT_INVALID_KEY");
  }
}

export function classifyS3Error(error: unknown, key: string): Error {
  if (error instanceof PermanentError || error instanceof TransientError) {
    return error;
  }
  if (isS3NotFound(error)) {
    return new PermanentError(`Object not found: ${key}`, "IMPORT_NOT_FOUND");
  }
  if (isS3AccessDenied(error)) {
    return new PermanentError(`Access denied: ${key}`, "IMPORT_S3_FORBIDDEN");
  }
  if (isS3Transient(error)) {
    const message = error instanceof Error ? error.message : "S3 transient failure";
    return new TransientError(message, "IMPORT_S3_TRANSIENT");
  }
  const message = error instanceof Error ? error.message : "S3 request failed";
  return new TransientError(message, "IMPORT_S3_TRANSIENT");
}

export function isS3NotFound(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const name = readString(error, "name");
  const code = readString(error, "Code") ?? readString(error, "code");
  if (name === "NotFound" || name === "NoSuchKey" || code === "NoSuchKey" || code === "NotFound") {
    return true;
  }
  return httpStatus(error) === 404;
}

export function isS3AccessDenied(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const name = readString(error, "name");
  const code = readString(error, "Code") ?? readString(error, "code");
  if (
    name === "AccessDenied" ||
    name === "Forbidden" ||
    code === "AccessDenied" ||
    code === "Forbidden"
  ) {
    return true;
  }
  return httpStatus(error) === 403;
}

export function isS3Transient(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const name = readString(error, "name") ?? "";
  const code = readString(error, "Code") ?? readString(error, "code") ?? "";
  const status = httpStatus(error);
  if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) {
    return true;
  }
  const token = `${name} ${code}`.toLowerCase();
  return (
    token.includes("throttl") ||
    token.includes("timeout") ||
    token.includes("slowdown") ||
    token.includes("econnreset") ||
    token.includes("etimedout") ||
    token.includes("requesttimeout")
  );
}

function httpStatus(error: object): number | undefined {
  if (!("$metadata" in error)) {
    return undefined;
  }
  const meta = error.$metadata;
  if (typeof meta !== "object" || meta === null || !("httpStatusCode" in meta)) {
    return undefined;
  }
  return typeof meta.httpStatusCode === "number" ? meta.httpStatusCode : undefined;
}

function readString(error: object, key: string): string | undefined {
  if (!(key in error)) {
    return undefined;
  }
  const value = (error as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
