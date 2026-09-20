import { Types } from "mongoose";
import { ContactModel } from "../../../../models/contact.model.js";
import { parseStartImportRequest } from "../dtos/import.dto.js";
import { planChunks } from "../parser/chunker.js";
import { ContactImportRepository } from "../repositories/contact-import.repository.js";
import { processChunk } from "../worker/process-chunk.js";
import {
  resetImportCollections,
  startImportTestMongo,
  stopImportTestMongo,
} from "./mongo-test-env.js";
import {
  createTempStore,
  phoneCsv,
  prepareProcessingJob,
  putText,
  workspace,
} from "./test-helpers.js";

const repo = new ContactImportRepository();

describe("skip-policy insertMany parity", () => {
  beforeAll(async () => {
    await startImportTestMongo();
  }, 120_000);

  afterAll(async () => {
    await stopImportTestMongo();
  });

  beforeEach(async () => {
    await resetImportCollections();
    await ContactModel.deleteMany({});
  });

  it("matches ContactModel.create on timestamps, defaults, and __v", async () => {
    const { store, cleanup } = await createTempStore();
    try {
      const ws = workspace();
      const accountId = new Types.ObjectId(ws.accountId);
      const created = await ContactModel.create({
        accountId,
        name: "Manual",
        email: "manual@kyra.test",
        phone: "+919876500001",
        source: "manual",
      });

      await putText(
        store,
        "parity.csv",
        phoneCsv([{ name: "Imported", phone: "+919876500002", email: "imported@kyra.test" }]),
      );
      const skipStart = parseStartImportRequest({
        mapping: [
          { source: "name", target: "name" },
          { source: "phone", target: "phone" },
          { source: "email", target: "email" },
        ],
        defaultCountry: "IN",
        policy: "skip",
      });
      const jobId = await prepareProcessingJob(repo, ws, "parity.csv", skipStart);
      const descriptors = await planChunks(store, "parity.csv", { delimiter: ",", rowsPerChunk: 10 });
      await processChunk(
        { workspaceId: ws, jobId, repository: repo, store },
        descriptors[0]!,
      );

      const imported = await ContactModel.findOne({
        accountId,
        email: "imported@kyra.test",
      }).lean();
      expect(imported).toBeTruthy();
      if (!imported) {
        return;
      }

      const createdLean = created.toObject();
      expect(createdLean.__v).toBeUndefined();
      expect((imported as { __v?: number }).__v).toBeUndefined();
      expect(createdLean.createdAt).toBeInstanceOf(Date);
      expect(createdLean.updatedAt).toBeInstanceOf(Date);
      expect(createdLean.lastActivity).toBeInstanceOf(Date);
      expect(imported.createdAt).toBeInstanceOf(Date);
      expect(imported.updatedAt).toBeInstanceOf(Date);
      expect(imported.lastActivity).toBeInstanceOf(Date);
      expect(createdLean.status).toBe("subscribed");
      expect(imported.status).toBe("subscribed");
      expect(createdLean.whatsapp?.optIn).toBe(true);
      expect(imported.whatsapp?.optIn).toBe(true);
      expect(createdLean.whatsapp?.source ?? "").toBe("");
      expect(imported.whatsapp?.source ?? "").toBe("");
      expect(createdLean.consent?.marketing).toBe(false);
      expect(imported.consent?.marketing).toBe(false);
    } finally {
      await cleanup();
    }
  });

  it("sets updatedAt on update and merge paths", async () => {
    const { store, cleanup } = await createTempStore();
    try {
      const ws = workspace();
      const accountId = new Types.ObjectId(ws.accountId);
      const forUpdate = await ContactModel.create({
        accountId,
        name: "Old-update",
        email: "update@kyra.test",
        phone: "+919876500010",
        source: "manual",
      });
      const forMerge = await ContactModel.create({
        accountId,
        email: "merge@kyra.test",
        phone: "+919876500011",
        source: "manual",
      });
      await new Promise((resolve) => setTimeout(resolve, 50));

      await putText(
        store,
        "update.csv",
        phoneCsv([{ name: "New-update", phone: "+919876500010", email: "update@kyra.test" }]),
      );
      await runPolicy(ws, store, "update.csv", "update");
      const updated = await ContactModel.findById(forUpdate._id);
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(forUpdate.updatedAt.getTime());
      expect(updated?.name).toBe("New-update");

      await putText(
        store,
        "merge.csv",
        phoneCsv([{ name: "New-merge", phone: "+919876500011", email: "merge@kyra.test" }]),
      );
      await runPolicy(ws, store, "merge.csv", "merge");
      const merged = await ContactModel.findById(forMerge._id);
      expect(merged?.updatedAt.getTime()).toBeGreaterThan(forMerge.updatedAt.getTime());
      expect(merged?.name).toBe("New-merge");
    } finally {
      await cleanup();
    }
  });
});

async function runPolicy(
  ws: ReturnType<typeof workspace>,
  store: Awaited<ReturnType<typeof createTempStore>>["store"],
  fileKey: string,
  policy: "update" | "merge",
): Promise<void> {
  const start = parseStartImportRequest({
    mapping: [
      { source: "name", target: "name" },
      { source: "phone", target: "phone" },
      { source: "email", target: "email" },
    ],
    defaultCountry: "IN",
    policy,
  });
  const jobId = await prepareProcessingJob(repo, ws, fileKey, start);
  const descriptors = await planChunks(store, fileKey, { delimiter: ",", rowsPerChunk: 10 });
  await processChunk({ workspaceId: ws, jobId, repository: repo, store }, descriptors[0]!);
}
