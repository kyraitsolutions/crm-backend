import { createReadStream } from "node:fs";
import path from "node:path";
import { Types } from "mongoose";
import { ContactModel } from "../../../../models/contact.model.js";
import { parseStartImportRequest } from "../dtos/import.dto.js";
import { ContactImportRepository } from "../repositories/contact-import.repository.js";
import type { FileStore } from "../store/file-store.js";
import {
  resetImportCollections,
  startImportTestMongo,
  stopImportTestMongo,
} from "./mongo-test-env.js";
import {
  buildContactCsv,
  defaultStart,
  planAndStart,
  wireRuntime,
} from "./orchestration-helpers.js";
import { createTempStore, putText, workspace } from "./test-helpers.js";
import { writeStreamingXlsx } from "./xlsx-writers.js";

const repo = new ContactImportRepository();

async function createUploadedJob(
  ws: ReturnType<typeof workspace>,
  fileKey: string,
): Promise<string> {
  const job = await repo.createJob({
    workspaceId: ws,
    createdBy: new Types.ObjectId().toHexString(),
    file: {
      bucket: "test",
      key: fileKey,
      fileName: "contacts.csv",
      mimeType: "text/csv",
      byteSize: 100,
    },
  });
  return job.id;
}

async function readText(store: FileStore, key: string): Promise<string> {
  const stream = await store.createReadStream(key);
  const parts: Buffer[] = [];
  for await (const chunk of stream) {
    parts.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(parts).toString("utf8");
}

describe("import orchestration scale", () => {
  beforeAll(async () => {
    await startImportTestMongo();
  }, 120_000);

  afterAll(async () => {
    await stopImportTestMongo();
  });

  beforeEach(async () => {
    await resetImportCollections();
    await ContactModel.deleteMany({});
  }, 120_000);

  it(
    "imports 100k rows through the fake queue with exact totals and error report",
    async () => {
      const { store, cleanup } = await createTempStore();
      try {
        const ws = workspace();
        const { csv, failedRowNumbers } = buildContactCsv(100_000, { failEvery: 1000 });
        await putText(store, "big.csv", csv);
        const jobId = await createUploadedJob(ws, "big.csv");
        const skipStart = parseStartImportRequest({
          mapping: defaultStart.mapping,
          defaultCountry: "IN",
          policy: "skip",
        });
        const { deps, queue } = wireRuntime(repo, store, {
          rowsPerChunk: 2000,
          dispatchK: 3,
          heartbeatMs: 0,
        });
        await planAndStart(deps, ws, jobId, skipStart);
        await queue.drain();

        const job = await repo.getJob(ws, jobId);
        expect(job?.status).toBe("completed_with_errors");
        expect(job?.counters.failed).toBe(failedRowNumbers.length);
        expect(job?.counters.processed).toBe(100_000);
        expect(job?.counters.inserted + (job?.counters.failed ?? 0)).toBe(100_000);
        expect(await ContactModel.countDocuments({ accountId: ws.accountId })).toBe(
          100_000 - failedRowNumbers.length,
        );

        expect(job?.errorReportKey).toBe(`reports/${jobId}/errors.csv`);
        const report = await readText(store, job?.errorReportKey ?? "");
        const lines = report.trim().split("\n");
        expect(lines[0]).toBe("rowNumber,reason,column,rawValue,raw");
        expect(lines.length - 1).toBe(failedRowNumbers.length);
        const reportedRows = lines.slice(1).map((line) => Number(line.split(",")[0]));
        expect(reportedRows).toEqual(failedRowNumbers);
      } finally {
        await cleanup();
      }
    },
    180_000,
  );

  it(
    "imports a 100k-row XLSX through the fake queue and matches the equivalent CSV",
    async () => {
      const { store, cleanup, root } = await createTempStore();
      try {
        const ws = workspace();
        const { csv, failedRowNumbers } = buildContactCsv(100_000, { failEvery: 1000 });
        const xlsxPath = path.join(root, "equiv.xlsx");
        await writeStreamingXlsx(xlsxPath, ["name", "phone", "email"], function* () {
          for (let index = 0; index < 100_000; index += 1) {
            const rowNumber = index + 1;
            if (rowNumber % 1000 === 0) {
              yield [`Bad${index}`, "not-a-phone", `bad${index}@kyra.test`];
            } else {
              yield [`N${index}`, `+91${9876500000 + index}`, `u${index}@kyra.test`];
            }
          }
        });
        await store.putStream("equiv.xlsx", createReadStream(xlsxPath));

        const skipStart = parseStartImportRequest({
          mapping: defaultStart.mapping,
          defaultCountry: "IN",
          policy: "skip",
        });
        const jobId = await createUploadedJob(ws, "equiv.xlsx");
        const { deps, queue } = wireRuntime(repo, store, {
          rowsPerChunk: 2000,
          dispatchK: 3,
          heartbeatMs: 0,
          xlsxTempDir: root,
        });
        await planAndStart(deps, ws, jobId, skipStart);
        await queue.drain();

        const job = await repo.getJob(ws, jobId);
        expect(job?.status).toBe("completed_with_errors");
        expect(job?.file.detected?.kind).toBe("xlsx");
        expect(job?.file.detected?.sheetName).toBe("Sheet1");
        expect(job?.counters.failed).toBe(failedRowNumbers.length);
        expect(job?.counters.processed).toBe(100_000);
        expect(job?.counters.inserted + (job?.counters.failed ?? 0)).toBe(100_000);

        const canonical = await readText(store, "equiv.xlsx.canonical.csv");
        expect(canonical).toBe(csv);

        const imported = await ContactModel.find({ accountId: ws.accountId })
          .select("email phone name")
          .lean();
        const importedKeys = imported
          .map((row) => `${row.email}\t${row.phone}\t${row.name}`)
          .sort();
        const expectedKeys: string[] = [];
        for (let index = 0; index < 100_000; index += 1) {
          if ((index + 1) % 1000 === 0) {
            continue;
          }
          expectedKeys.push(`u${index}@kyra.test\t+91${9876500000 + index}\tN${index}`);
        }
        expectedKeys.sort();
        expect(importedKeys).toEqual(expectedKeys);
      } finally {
        await cleanup();
      }
    },
    360_000,
  );
});
