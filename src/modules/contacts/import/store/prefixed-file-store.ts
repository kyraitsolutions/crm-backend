import type { Readable } from "node:stream";
import type { FileReadRange, FileStore } from "./file-store.js";

export class PrefixedFileStore implements FileStore {
  constructor(
    private readonly inner: FileStore,
    private readonly prefix: string,
  ) {}

  createReadStream(key: string, range?: FileReadRange): Promise<Readable> {
    return this.inner.createReadStream(this.scoped(key), range);
  }

  putStream(key: string, stream: Readable): Promise<void> {
    return this.inner.putStream(this.scoped(key), stream);
  }

  exists(key: string): Promise<boolean> {
    return this.inner.exists(this.scoped(key));
  }

  delete(key: string): Promise<void> {
    return this.inner.delete(this.scoped(key));
  }

  size(key: string): Promise<number> {
    return this.inner.size(this.scoped(key));
  }

  scoped(key: string): string {
    const trimmed = this.prefix.replace(/\/+$/, "");
    return `${trimmed}/${key}`;
  }
}
