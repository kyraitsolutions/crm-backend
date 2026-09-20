import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import { ContactModel } from "../../../../models/contact.model.js";
import { ContactImportChunkModel } from "../models/contact-import-chunk.model.js";
import { ContactImportJobModel } from "../models/contact-import-job.model.js";

let replSet: MongoMemoryReplSet | undefined;

export function resolveMongoTmpDir(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const override = env.IMPORT_MONGO_TMP?.trim();
  if (override) {
    return override;
  }
  return os.tmpdir();
}

export function importTestMongoUri(): string {
  if (!replSet) {
    throw new Error("import test Mongo is not started");
  }
  return replSet.getUri();
}

export async function startImportTestMongo(): Promise<void> {
  const mongoTmp = resolveMongoTmpDir();
  await mkdir(mongoTmp, { recursive: true });
  const dbPath = path.join(mongoTmp, `rs-${process.pid}-${Date.now()}`);
  await mkdir(dbPath, { recursive: true });
  replSet = await MongoMemoryReplSet.create({
    instanceOpts: [
      {
        dbPath,
        storageEngine: "wiredTiger",
      },
    ],
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  await mongoose.connect(replSet.getUri());
  await Promise.all([
    ContactModel.syncIndexes(),
    ContactImportJobModel.syncIndexes(),
    ContactImportChunkModel.syncIndexes(),
  ]);
}

export async function stopImportTestMongo(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (replSet) {
    await replSet.stop().catch(() => undefined);
    replSet = undefined;
  }
}

export async function resetImportCollections(): Promise<void> {
  await Promise.all([
    ContactModel.deleteMany({}),
    ContactImportJobModel.deleteMany({}),
    ContactImportChunkModel.deleteMany({}),
  ]);
}
