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

describe("import consent attestation", () => {
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

  it("writes marketing true only when the job has an attestation", async () => {
    const { store, cleanup } = await createTempStore();
    try {
      const ws = workspace();
      await putText(
        store,
        "attested.csv",
        phoneCsv([{ name: "Ada", phone: "+919876500001", email: "ada@kyra.test" }]),
      );
      const start = parseStartImportRequest({
        mapping: [
          { source: "name", target: "name" },
          { source: "phone", target: "phone" },
          { source: "email", target: "email" },
        ],
        defaultCountry: "IN",
        policy: "update",
      });
      const jobId = await prepareProcessingJob(repo, ws, "attested.csv", start);
      await repo.patchJob(ws, jobId, {
        consentAttestation: {
          confirmed: true,
          userId: new Types.ObjectId().toHexString(),
          at: new Date(),
          textVersion: "import-consent-v1",
        },
      });
      const descriptors = await planChunks(store, "attested.csv", {
        delimiter: ",",
        rowsPerChunk: 10,
      });
      await processChunk({ workspaceId: ws, jobId, repository: repo, store }, descriptors[0]!);
      const imported = await ContactModel.findOne({ email: "ada@kyra.test" }).lean();
      expect(imported?.consent?.marketing).toBe(true);
      expect(imported?.consent?.source).toBe("import");
    } finally {
      await cleanup();
    }
  });

  it("does not change existing consent or opt-out on update or merge", async () => {
    const { store, cleanup } = await createTempStore();
    try {
      const ws = workspace();
      const accountId = new Types.ObjectId(ws.accountId);
      const existing = await ContactModel.create({
        accountId,
        name: "Old",
        email: "keep@kyra.test",
        phone: "+919876500010",
        source: "manual",
        consent: { marketing: false, source: "manual", timestamp: new Date("2020-01-01") },
        whatsapp: { optIn: false, source: "manual" },
      });
      await putText(
        store,
        "update.csv",
        phoneCsv([{ name: "New", phone: "+919876500010", email: "keep@kyra.test" }]),
      );
      await runWithAttestation(ws, store, "update.csv", "update");
      const updated = await ContactModel.findById(existing._id).lean();
      expect(updated?.name).toBe("New");
      expect(updated?.consent?.marketing).toBe(false);
      expect(updated?.whatsapp?.optIn).toBe(false);

      await putText(
        store,
        "merge.csv",
        phoneCsv([{ name: "Merged", phone: "+919876500010", email: "keep@kyra.test" }]),
      );
      await runWithAttestation(ws, store, "merge.csv", "merge");
      const merged = await ContactModel.findById(existing._id).lean();
      expect(merged?.name).toBe("New");
      expect(merged?.consent?.marketing).toBe(false);
      expect(merged?.whatsapp?.optIn).toBe(false);
    } finally {
      await cleanup();
    }
  });
});

async function runWithAttestation(
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
  await repo.patchJob(ws, jobId, {
    consentAttestation: {
      confirmed: true,
      userId: new Types.ObjectId().toHexString(),
      at: new Date(),
      textVersion: "import-consent-v1",
    },
  });
  const descriptors = await planChunks(store, fileKey, { delimiter: ",", rowsPerChunk: 10 });
  await processChunk({ workspaceId: ws, jobId, repository: repo, store }, descriptors[0]!);
}
