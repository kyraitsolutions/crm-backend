import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { Types } from "mongoose";
import { ContactImportRepository } from "../repositories/contact-import.repository.js";
import type { FileStore } from "../store/file-store.js";
import { LocalFileStore } from "../store/local-file-store.js";
import type { ImportWorkspaceId, StartImportRequest } from "../types/import.types.js";
import { persistStartConfig } from "../worker/persist-start.js";

export async function createTempStore(): Promise<{
  store: LocalFileStore;
  root: string;
  cleanup: () => Promise<void>;
}> {
  const tmpRoot = process.env.IMPORT_FILE_TMP?.trim() || os.tmpdir();
  await mkdir(tmpRoot, { recursive: true });
  const root = await mkdtemp(path.join(tmpRoot, "import-test-"));
  return {
    store: new LocalFileStore(root),
    root,
    cleanup: () => rm(root, { recursive: true, force: true }),
  };
}

export async function putText(
  store: FileStore,
  key: string,
  text: string | Buffer,
): Promise<void> {
  await store.putStream(key, Readable.from([text]));
}

export function workspace(): ImportWorkspaceId {
  return {
    organizationId: new Types.ObjectId().toHexString(),
    accountId: new Types.ObjectId().toHexString(),
  };
}

export async function prepareProcessingJob(
  repo: ContactImportRepository,
  ws: ImportWorkspaceId,
  fileKey: string,
  start: StartImportRequest,
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
  await repo.transition(ws, job.id, "uploaded", "validating");
  await repo.transition(ws, job.id, "validating", "mapping", {
    headers: start.mapping.map((item) => item.source),
    file: {
      bucket: "test",
      key: fileKey,
      fileName: "contacts.csv",
      mimeType: "text/csv",
      byteSize: 100,
      detected: {
        kind: "csv",
        encoding: "utf-8",
        delimiter: ",",
        hasBom: false,
      },
    },
  });
  const queued = await persistStartConfig(repo, ws, job.id, start);
  if (!queued.ok) {
    throw new Error(`failed to persist start config: ${queued.reason}`);
  }
  const processing = await repo.transition(ws, job.id, "queued", "processing");
  if (!processing.ok) {
    throw new Error(`failed to start processing: ${processing.reason}`);
  }
  return job.id;
}

export function phoneCsv(rows: Array<{ name: string; phone: string; email?: string }>): string {
  const header = "name,phone,email\n";
  return (
    header +
    rows
      .map((row) => `${row.name},${row.phone},${row.email ?? ""}`)
      .join("\n") +
    "\n"
  );
}

export function indianPhone(index: number): string {
  const national = 9876500000 + index;
  return `+91${national}`;
}
