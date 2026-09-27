import mongoose from "mongoose";
import { config } from "../../config/index.js";
import { IMPORT_JOB_TTL_SECONDS } from "../../modules/contacts/import/constants/import.constant.js";

type EnsureResult = {
  collection: string;
  name: string;
  status: "created" | "exists" | "conflict";
  detail?: string;
};

async function ensureIndex(
  collection: mongoose.mongo.Collection,
  keys: Record<string, 1 | -1>,
  options: mongoose.mongo.CreateIndexesOptions & { name: string },
): Promise<EnsureResult> {
  const collectionName = collection.collectionName;
  const indexes = await collection.indexes();
  const found = indexes.find((index) => index.name === options.name);
  if (found) {
    return {
      collection: collectionName,
      name: options.name,
      status: "exists",
    };
  }
  try {
    await collection.createIndex(keys, options);
    return {
      collection: collectionName,
      name: options.name,
      status: "created",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      collection: collectionName,
      name: options.name,
      status: "conflict",
      detail: message,
    };
  }
}

async function run(): Promise<void> {
  await mongoose.connect(config.db.url);
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Mongo connection has no db handle");
  }

  const contacts = db.collection("contacts");
  const jobs = db.collection("contact_import_jobs");
  const chunks = db.collection("contact_import_chunks");

  const results: EnsureResult[] = [];

  results.push(
    await ensureIndex(
      contacts,
      { accountId: 1, email: 1 },
      {
        name: "uniq_account_email",
        unique: true,
        collation: { locale: "en", strength: 2 },
        partialFilterExpression: { email: { $type: "string", $gt: "" } },
      },
    ),
  );
  results.push(
    await ensureIndex(
      contacts,
      { accountId: 1, phone: 1 },
      {
        name: "uniq_account_phone",
        unique: true,
        partialFilterExpression: { phone: { $type: "string", $gt: "" } },
      },
    ),
  );
  results.push(
    await ensureIndex(
      jobs,
      { organizationId: 1, accountId: 1, clientRequestId: 1 },
      {
        name: "uniq_import_client_request",
        unique: true,
        partialFilterExpression: { clientRequestId: { $type: "string", $gt: "" } },
      },
    ),
  );
  results.push(
    await ensureIndex(jobs, { accountId: 1, createdAt: -1 }, {
      name: "idx_import_account_created",
    }),
  );
  results.push(
    await ensureIndex(jobs, { organizationId: 1, status: 1 }, {
      name: "idx_import_org_status",
    }),
  );
  results.push(
    await ensureIndex(jobs, { status: 1, updatedAt: 1 }, {
      name: "idx_import_status_updated",
    }),
  );
  results.push(
    await ensureIndex(jobs, { createdAt: 1 }, {
      name: "ttl_import_jobs",
      expireAfterSeconds: IMPORT_JOB_TTL_SECONDS,
    }),
  );
  results.push(
    await ensureIndex(chunks, { jobId: 1, index: 1 }, {
      name: "uniq_import_chunk",
      unique: true,
    }),
  );
  results.push(
    await ensureIndex(chunks, { jobId: 1, status: 1 }, {
      name: "idx_import_chunk_status",
    }),
  );

  console.log("Contact import index ensure (createIndex only, no drops)");
  for (const result of results) {
    const suffix = result.detail ? ` — ${result.detail}` : "";
    console.log(`${result.status}\t${result.collection}.${result.name}${suffix}`);
  }

  const conflicts = results.filter((result) => result.status === "conflict");
  await mongoose.disconnect();
  if (conflicts.length > 0) {
    process.exit(1);
  }
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Index ensure failed:", message);
  process.exit(1);
});
