import type { Readable } from "node:stream";

/**
 * Byte range for `createReadStream`. `end` is inclusive, matching Node
 * `fs.createReadStream({ end })` and the S3 `Range: bytes=start-end` header.
 * Callers that have an exclusive end (e.g. chunk `byteOffsetEnd`) must pass
 * `end: exclusiveEnd - 1`.
 */
export interface FileReadRange {
  start?: number;
  end?: number;
}

export interface FileStore {
  createReadStream(key: string, range?: FileReadRange): Promise<Readable>;
  putStream(key: string, stream: Readable): Promise<void>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
  size(key: string): Promise<number>;
}
