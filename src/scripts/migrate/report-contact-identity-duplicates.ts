import mongoose from "mongoose";
import { config } from "../../config/index.js";

type DuplicateGroup = {
  accountId: string;
  key: string;
  value: string;
  count: number;
  ids: string[];
};

async function findDuplicates(
  collection: mongoose.mongo.Collection,
  field: "email" | "phone",
  collation?: { locale: string; strength: number },
): Promise<DuplicateGroup[]> {
  const pipeline: mongoose.mongo.Document[] = [
    { $match: { [field]: { $type: "string", $gt: "" } } },
    {
      $group: {
        _id: { accountId: "$accountId", value: `$${field}` },
        count: { $sum: 1 },
        ids: { $push: { $toString: "$_id" } },
      },
    },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 500 },
  ];

  const rows = collation
    ? await collection.aggregate(pipeline, { collation }).toArray()
    : await collection.aggregate(pipeline).toArray();

  return rows.map((row) => {
    const id = row._id as { accountId: unknown; value: unknown };
    const ids = Array.isArray(row.ids) ? row.ids.map((item) => String(item)) : [];
    return {
      accountId: String(id.accountId),
      key: field,
      value: String(id.value),
      count: Number(row.count),
      ids,
    };
  });
}

async function run(): Promise<void> {
  await mongoose.connect(config.db.url);
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Mongo connection has no db handle");
  }

  const contacts = db.collection("contacts");
  const emailDupes = await findDuplicates(contacts, "email", {
    locale: "en",
    strength: 2,
  });
  const phoneDupes = await findDuplicates(contacts, "phone");
  const all = [...emailDupes, ...phoneDupes];

  console.log(
    JSON.stringify(
      {
        wouldBlockUniqueIndex: all.length > 0,
        emailDuplicateGroups: emailDupes.length,
        phoneDuplicateGroups: phoneDupes.length,
        groups: all,
      },
      null,
      2,
    ),
  );

  await mongoose.disconnect();
  process.exit(all.length > 0 ? 2 : 0);
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Duplicate report failed:", message);
  process.exit(1);
});
