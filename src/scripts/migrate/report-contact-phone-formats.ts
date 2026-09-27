import mongoose from "mongoose";
import { config } from "../../config/index.js";

type AccountReport = {
  accountId: string;
  totalWithPhone: number;
  notE164: number;
};

async function run(): Promise<void> {
  await mongoose.connect(config.db.url);
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Mongo connection has no db handle");
  }

  const contacts = db.collection("contacts");
  const rows = await contacts
    .aggregate<AccountReport>([
      { $match: { phone: { $type: "string", $gt: "" } } },
      {
        $project: {
          accountId: 1,
          isE164: {
            $regexMatch: {
              input: "$phone",
              regex: /^\+[1-9]\d{7,14}$/,
            },
          },
        },
      },
      {
        $group: {
          _id: "$accountId",
          totalWithPhone: { $sum: 1 },
          notE164: { $sum: { $cond: ["$isE164", 0, 1] } },
        },
      },
      { $project: { _id: 0, accountId: { $toString: "$_id" }, totalWithPhone: 1, notE164: 1 } },
      { $sort: { notE164: -1 } },
    ])
    .toArray();

  const totalNotE164 = rows.reduce((sum, row) => sum + row.notE164, 0);
  console.log(
    JSON.stringify(
      {
        accounts: rows.length,
        totalNotE164,
        reports: rows,
      },
      null,
      2,
    ),
  );

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Phone format report failed:", message);
  process.exit(1);
});
