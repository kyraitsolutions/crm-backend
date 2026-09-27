import { randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { access, mkdir, rename, stat, unlink } from "node:fs/promises";
import path from "node:path";
import type { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { PermanentError } from "../errors/import-worker.errors.js";
import type { FileReadRange, FileStore } from "./file-store.js";

export class LocalFileStore implements FileStore {
  constructor(private readonly rootDir: string) {}

  async createReadStream(key: string, range: FileReadRange = {}): Promise<Readable> {
    const filePath = this.resolve(key);
    await this.assertExists(filePath, key);
    return createReadStream(filePath, {
      start: range.start,
      end: range.end,
      highWaterMark: 16 * 1024,
    });
  }

  async putStream(key: string, stream: Readable): Promise<void> {
    const filePath = this.resolve(key);
    await mkdir(path.dirname(filePath), { recursive: true });
    const partPath = `${filePath}.${randomUUID()}.part`;
    try {
      await pipeline(stream, createWriteStream(partPath));
      await rename(partPath, filePath);
    } catch (error) {
      await unlink(partPath).catch(() => undefined);
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    const filePath = this.resolve(key);
    try {
      await access(filePath);
      return true;
    } catch (error) {
      if (isNotFoundError(error)) {
        return false;
      }
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    const filePath = this.resolve(key);
    try {
      await unlink(filePath);
    } catch (error) {
      if (isNotFoundError(error)) {
        return;
      }
      throw error;
    }
  }

  async size(key: string): Promise<number> {
    const filePath = this.resolve(key);
    await this.assertExists(filePath, key);
    const info = await stat(filePath);
    return info.size;
  }

  resolvePath(key: string): string {
    return this.resolve(key);
  }

  private async assertExists(filePath: string, key: string): Promise<void> {
    try {
      await access(filePath);
    } catch {
      throw new PermanentError(`Object not found: ${key}`, "IMPORT_NOT_FOUND");
    }
  }

  private resolve(key: string): string {
    if (!key || key.includes("\0") || key.split(/[/\\]/).includes("..")) {
      throw new PermanentError("Invalid storage key", "IMPORT_INVALID_KEY");
    }
    const root = path.resolve(this.rootDir);
    const resolved = path.resolve(root, key);
    const prefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
    if (resolved !== root && !resolved.startsWith(prefix)) {
      throw new PermanentError("Invalid storage key", "IMPORT_INVALID_KEY");
    }
    return resolved;
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === "object" && error !== null && "code" in error;
}

function isNotFoundError(error: unknown): boolean {
  return isNodeError(error) && error.code === "ENOENT";
}
