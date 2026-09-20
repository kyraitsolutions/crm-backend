import { S3Client } from "@aws-sdk/client-s3";
import { Readable } from "node:stream";
import { PermanentError } from "../../errors/import-worker.errors.js";
import { planChunks, readChunkRows } from "../../parser/chunker.js";
import { S3FileStore } from "../../store/s3-file-store.js";
import { createTempStore, putText } from "../test-helpers.js";
import { createPrefixedMinioStore, requireIntegrationEnv } from "./helpers.js";

const enabled = Boolean(process.env.MINIO_ENDPOINT ?? process.env.AWS_S3_ENDPOINT);
const describeMinio = enabled ? describe : describe.skip;

async function readAll(
  store: { createReadStream: typeof S3FileStore.prototype.createReadStream },
  key: string,
  range?: { start?: number; end?: number },
): Promise<Buffer> {
  const stream = await store.createReadStream(key, range);
  const parts: Buffer[] = [];
  for await (const chunk of stream) {
    parts.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(parts);
}

describeMinio("S3FileStore on MinIO", () => {
  requireIntegrationEnv();

  it("uses inclusive Range end matching S3 (not exclusive)", async () => {
    const ctx = await createPrefixedMinioStore();
    try {
      const ascii = Buffer.from("0123456789");
      await ctx.store.putStream("range.txt", Readable.from([ascii]));
      const inclusive = await readAll(ctx.store, "range.txt", { start: 2, end: 5 });
      expect(inclusive.toString("utf8")).toBe("2345");
      expect(inclusive.length).toBe(4);

      const utf8 = Buffer.from('say "€"\nnext', "utf8");
      await ctx.store.putStream("utf8.txt", Readable.from([utf8]));
      const euroStart = Buffer.from("say \"", "utf8").length;
      const euroEnd = euroStart + Buffer.from("€", "utf8").length - 1;
      const euro = await readAll(ctx.store, "utf8.txt", { start: euroStart, end: euroEnd });
      expect(euro.toString("utf8")).toBe("€");
    } finally {
      await ctx.cleanup();
    }
  });

  it("chunks the same CSV through LocalFileStore and S3FileStore identically", async () => {
    const ctx = await createPrefixedMinioStore();
    const local = await createTempStore();
    try {
      const csv = [
        "name,phone,email",
        `"hello\nworld",+919876500001,a@kyra.test`,
        "N2,+919876500002,b@kyra.test",
        "N3,+919876500003,c@kyra.test",
        "",
      ].join("\n");
      await putText(local.store, "same.csv", csv);
      await putText(ctx.store, "same.csv", csv);

      const localChunks = await planChunks(local.store, "same.csv", {
        delimiter: ",",
        rowsPerChunk: 2,
      });
      const s3Chunks = await planChunks(ctx.store, "same.csv", {
        delimiter: ",",
        rowsPerChunk: 2,
      });
      expect(s3Chunks).toEqual(localChunks);
      expect(localChunks.length).toBeGreaterThan(0);

      for (const descriptor of localChunks) {
        const localRows = await readChunkRows(local.store, "same.csv", descriptor, ",");
        const s3Rows = await readChunkRows(ctx.store, "same.csv", descriptor, ",");
        expect(s3Rows.map((row) => row.fields)).toEqual(localRows.map((row) => row.fields));
        expect(s3Rows.map((row) => row.rowNumber)).toEqual(localRows.map((row) => row.rowNumber));
      }
      expect(localChunks[0]?.startRow).toBe(1);
      const first = await readChunkRows(ctx.store, "same.csv", localChunks[0]!, ",");
      expect(first[0]?.fields[0]).toBe("hello\nworld");
    } finally {
      await ctx.cleanup();
      await local.cleanup();
    }
  });

  it("multipart-puts a ~20 MB errors.csv assembled from many small parts", async () => {
    const ctx = await createPrefixedMinioStore();
    try {
      const part = Buffer.alloc(200 * 1024, 97);
      const parts = Array.from({ length: 100 }, () => part);
      const expected = 100 * 200 * 1024;
      await ctx.store.putStream("reports/job/errors.csv", Readable.from(parts));
      expect(await ctx.store.size("reports/job/errors.csv")).toBe(expected);
      const head = await readAll(ctx.store, "reports/job/errors.csv", { start: 0, end: 9 });
      expect(head.toString("utf8")).toBe("aaaaaaaaaa");
    } finally {
      await ctx.cleanup();
    }
  });

  it("classifies NoSuchKey and AccessDenied as PermanentError without retrying", async () => {
    const ctx = await createPrefixedMinioStore();
    try {
      await putText(ctx.store, "exists.txt", "ok");
      const missingStarted = Date.now();
      await expect(ctx.store.size("missing.txt")).rejects.toBeInstanceOf(PermanentError);
      expect(Date.now() - missingStarted).toBeLessThan(2_000);

      const env = requireIntegrationEnv();
      const bad = new S3FileStore({
        client: new S3Client({
          region: "us-east-1",
          endpoint: env.minioEndpoint,
          forcePathStyle: true,
          credentials: {
            accessKeyId: "not-a-real-user",
            secretAccessKey: "not-a-real-secret",
          },
        }),
        bucket: env.bucket,
        maxAttempts: 4,
      });
      const deniedStarted = Date.now();
      await expect(bad.size(ctx.store.scoped("exists.txt"))).rejects.toMatchObject({
        name: "PermanentError",
        code: "IMPORT_S3_FORBIDDEN",
      });
      expect(Date.now() - deniedStarted).toBeLessThan(2_000);
    } finally {
      await ctx.cleanup();
    }
  });
});
