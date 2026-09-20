import {
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { mockClient } from "aws-sdk-client-mock";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { PermanentError } from "../errors/import-worker.errors.js";
import type { FileStore } from "../store/file-store.js";
import { S3FileStore } from "../store/s3-file-store.js";
import { createTempStore, putText } from "./test-helpers.js";

function defineFileStoreContract(
  name: string,
  setup: () => Promise<{ store: FileStore; cleanup: () => Promise<void> }>,
): void {
  describe(name, () => {
    let store: FileStore;
    let cleanup: () => Promise<void>;

    beforeEach(async () => {
      const ctx = await setup();
      store = ctx.store;
      cleanup = ctx.cleanup;
    });

    afterEach(async () => {
      await cleanup();
    });

    it("puts, reads, ranges, overwrites, and deletes", async () => {
      await putText(store, "folder/file.txt", "abcdefghij");
      expect(await store.exists("folder/file.txt")).toBe(true);
      expect(await store.size("folder/file.txt")).toBe(10);

      const full = await readAll(store, "folder/file.txt");
      expect(full).toBe("abcdefghij");

      const ranged = await readAll(store, "folder/file.txt", { start: 2, end: 5 });
      expect(ranged).toBe("cdef");

      const utf8 = Buffer.from("a€c", "utf8");
      await store.putStream("folder/utf8.txt", Readable.from([utf8]));
      const euro = await readAll(store, "folder/utf8.txt", { start: 1, end: 3 });
      expect(euro).toBe("€");
      expect(Buffer.from(euro, "utf8")).toEqual(Buffer.from("€", "utf8"));

      await putText(store, "folder/file.txt", "xyz");
      expect(await readAll(store, "folder/file.txt")).toBe("xyz");

      await store.delete("folder/file.txt");
      expect(await store.exists("folder/file.txt")).toBe(false);
      await store.delete("folder/file.txt");
    });

    it("rejects path traversal keys", async () => {
      await expect(store.exists("../secret")).rejects.toBeInstanceOf(PermanentError);
    });
  });
}

async function readAll(
  store: FileStore,
  key: string,
  range?: { start?: number; end?: number },
): Promise<string> {
  const stream = await store.createReadStream(key, range);
  const parts: Buffer[] = [];
  for await (const chunk of stream) {
    parts.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(parts).toString("utf8");
}

defineFileStoreContract("LocalFileStore contract", async () => createTempStore());

defineFileStoreContract("S3FileStore contract (aws-sdk-client-mock)", async () => {
  const objects = new Map<string, Buffer>();
  const uploads = new Map<string, { key: string; parts: Map<number, Buffer> }>();
  const client = new S3Client({ region: "us-east-1" });
  const s3Mock = mockClient(client);

  s3Mock.on(PutObjectCommand).callsFake(async (input) => {
    if (typeof input.Key !== "string") {
      throw new Error("missing key");
    }
    objects.set(input.Key, await collectBody(input.Body));
    return {};
  });

  s3Mock.on(GetObjectCommand).callsFake((input) => {
    if (typeof input.Key !== "string") {
      throw notFound();
    }
    const stored = objects.get(input.Key);
    if (!stored) {
      throw notFound();
    }
    const sliced = applyRange(stored, input.Range);
    return { Body: Readable.from([sliced]), ContentLength: sliced.length };
  });

  s3Mock.on(HeadObjectCommand).callsFake((input) => {
    if (typeof input.Key !== "string") {
      throw notFound();
    }
    const stored = objects.get(input.Key);
    if (!stored) {
      throw notFound();
    }
    return { ContentLength: stored.length };
  });

  s3Mock.on(DeleteObjectCommand).callsFake((input) => {
    if (typeof input.Key === "string") {
      objects.delete(input.Key);
    }
    return {};
  });

  s3Mock.on(CreateMultipartUploadCommand).callsFake((input) => {
    const uploadId = randomUUID();
    uploads.set(uploadId, { key: String(input.Key), parts: new Map() });
    return { UploadId: uploadId, Key: input.Key, Bucket: input.Bucket };
  });

  s3Mock.on(UploadPartCommand).callsFake(async (input) => {
    const session = uploads.get(String(input.UploadId));
    if (!session || typeof input.PartNumber !== "number") {
      throw new Error("bad part");
    }
    session.parts.set(input.PartNumber, await collectBody(input.Body));
    return { ETag: `"${input.PartNumber}"` };
  });

  s3Mock.on(CompleteMultipartUploadCommand).callsFake((input) => {
    const session = uploads.get(String(input.UploadId));
    if (!session) {
      throw new Error("missing upload");
    }
    const ordered = [...session.parts.entries()]
      .sort((left, right) => left[0] - right[0])
      .map((entry) => entry[1]);
    objects.set(session.key, Buffer.concat(ordered));
    return { Key: session.key, Bucket: input.Bucket };
  });

  return {
    store: new S3FileStore({ client, bucket: "import-test", maxAttempts: 1 }),
    cleanup: async () => {
      s3Mock.reset();
      objects.clear();
    },
  };
});

function notFound(): Error {
  return Object.assign(new Error("NoSuchKey"), {
    name: "NoSuchKey",
    $metadata: { httpStatusCode: 404 },
  });
}

async function collectBody(body: unknown): Promise<Buffer> {
  if (Buffer.isBuffer(body)) {
    return body;
  }
  if (typeof body === "string") {
    return Buffer.from(body);
  }
  if (body instanceof Readable) {
    const parts: Buffer[] = [];
    for await (const chunk of body) {
      parts.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(parts);
  }
  return Buffer.alloc(0);
}

function applyRange(buffer: Buffer, range: string | undefined): Buffer {
  if (!range || !range.startsWith("bytes=")) {
    return buffer;
  }
  const spec = range.slice("bytes=".length);
  const [startRaw, endRaw] = spec.split("-");
  const start = startRaw ? Number(startRaw) : 0;
  const end = endRaw ? Number(endRaw) : buffer.length - 1;
  return buffer.subarray(start, end + 1);
}
