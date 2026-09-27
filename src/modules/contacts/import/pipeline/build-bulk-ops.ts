import { Types, type AnyBulkWriteOperation } from "mongoose";
import type { Contact } from "../../../../models/contact.model.js";
import type { DuplicatePolicy, MergeRules } from "../types/import.types.js";
import type { ChunkRow } from "./dedupe-chunk.js";
import type { ValidatedContact } from "./validate-row.js";

export interface BulkOpBinding {
  rowNumber: number;
  raw: string[];
}

export interface BuiltBulkWrite {
  ops: AnyBulkWriteOperation<Contact>[];
  bindings: BulkOpBinding[];
}

export interface BuildBulkOpsOptions {
  consentMarketing?: boolean;
}

export function buildBulkOps(
  rows: ChunkRow[],
  accountId: string,
  policy: DuplicatePolicy,
  merge: MergeRules,
  options: BuildBulkOpsOptions = {},
): BuiltBulkWrite {
  const accountObjectId = new Types.ObjectId(accountId);
  const now = new Date();
  const ops: AnyBulkWriteOperation<Contact>[] = [];
  const bindings: BulkOpBinding[] = [];

  for (const row of rows) {
    const filter = identityFilter(accountObjectId, row.contact);
    if (policy === "skip") {
      const setOnInsert = insertDocument(accountObjectId, row.contact, now, options.consentMarketing === true);
      delete setOnInsert.lastActivity;
      ops.push({
        updateOne: {
          filter,
          upsert: true,
          update: {
            $setOnInsert: setOnInsert,
            $currentDate: { lastActivity: true },
          },
        },
      });
    } else if (policy === "merge") {
      ops.push({
        updateOne: {
          filter,
          upsert: true,
          update: mergePipeline(accountObjectId, row.contact, merge, now, options.consentMarketing === true),
        },
      });
    } else {
      ops.push({
        updateOne: {
          filter,
          upsert: true,
          update: updateOperators(
            accountObjectId,
            row.contact,
            merge.allowStatusUpgrade,
            now,
            options.consentMarketing === true,
          ),
        },
      });
    }
    bindings.push({ rowNumber: row.rowNumber, raw: row.raw });
  }

  return { ops, bindings };
}

export function buildInsertDocuments(
  rows: ChunkRow[],
  accountId: string,
  options: BuildBulkOpsOptions = {},
): Array<Record<string, unknown>> {
  const accountObjectId = new Types.ObjectId(accountId);
  const now = new Date();
  return rows.map((row) =>
    insertDocument(accountObjectId, row.contact, now, options.consentMarketing === true),
  );
}

function identityFilter(
  accountId: Types.ObjectId,
  contact: ValidatedContact,
): Record<string, unknown> {
  if (contact.identityField === "phone") {
    return { accountId, phone: contact.identityValue };
  }
  return { accountId, email: contact.identityValue };
}

function insertDocument(
  accountId: Types.ObjectId,
  contact: ValidatedContact,
  now: Date,
  consentMarketing: boolean,
): Record<string, unknown> {
  const doc: Record<string, unknown> = {
    accountId,
    source: "import",
    status: contact.status ?? "subscribed",
    tags: contact.tags ?? [],
    consent: {
      marketing: consentMarketing,
      source: "import",
      timestamp: now,
    },
    whatsapp: { optIn: contact.whatsappOptIn ?? true, source: "" },
    createdAt: now,
    updatedAt: now,
    lastActivity: now,
  };
  if (contact.name) {
    doc.name = contact.name;
  }
  if (contact.email) {
    doc.email = contact.email;
  }
  if (contact.phone) {
    doc.phone = contact.phone;
  }
  return doc;
}

function updateOperators(
  accountId: Types.ObjectId,
  contact: ValidatedContact,
  allowStatusUpgrade: boolean,
  now: Date,
  consentMarketing: boolean,
): Record<string, unknown> {
  const set: Record<string, unknown> = {};
  if (contact.name) {
    set.name = contact.name;
  }
  if (contact.tags) {
    set.tags = contact.tags;
  }
  if (contact.email && contact.identityField !== "email") {
    set.email = contact.email;
  }
  if (contact.phone && contact.identityField !== "phone") {
    set.phone = contact.phone;
  }
  if (allowStatusUpgrade && contact.status) {
    set.status = contact.status;
  }

  const setOnInsert = insertDocument(accountId, contact, now, consentMarketing);
  for (const key of Object.keys(set)) {
    delete setOnInsert[key];
  }
  delete setOnInsert.updatedAt;
  delete setOnInsert.lastActivity;

  return {
    $set: set,
    $setOnInsert: setOnInsert,
    $currentDate: { lastActivity: true, updatedAt: true },
  };
}

function mergePipeline(
  accountId: Types.ObjectId,
  contact: ValidatedContact,
  merge: MergeRules,
  now: Date,
  consentMarketing: boolean,
): Record<string, unknown>[] {
  const set: Record<string, unknown> = {
    accountId: { $ifNull: ["$accountId", accountId] },
    source: { $ifNull: ["$source", "import"] },
    updatedAt: now,
    lastActivity: now,
    consent: {
      $cond: [
        { $eq: [{ $type: "$consent" }, "missing"] },
        { marketing: consentMarketing, source: "import", timestamp: now },
        "$consent",
      ],
    },
    whatsapp: {
      $cond: [
        { $eq: [{ $type: "$whatsapp" }, "missing"] },
        { optIn: contact.whatsappOptIn ?? true, source: "" },
        "$whatsapp",
      ],
    },
  };

  const fillable = new Set(merge.emptyOnly);
  if (contact.name !== undefined) {
    set.name = fillable.has("name") ? emptyOr(contact.name, "$name") : keepOrInsert("$name", contact.name);
  }
  if (contact.email !== undefined) {
    set.email = fillable.has("email") ? emptyOr(contact.email, "$email") : keepOrInsert("$email", contact.email);
  }
  if (contact.phone !== undefined) {
    set.phone = fillable.has("phone") ? emptyOr(contact.phone, "$phone") : keepOrInsert("$phone", contact.phone);
  }
  if (contact.tags) {
    set.tags =
      merge.tags === "union"
        ? { $setUnion: [{ $ifNull: ["$tags", []] }, contact.tags] }
        : fillable.has("tags")
          ? {
              $cond: [
                { $eq: [{ $size: { $ifNull: ["$tags", []] } }, 0] },
                contact.tags,
                "$tags",
              ],
            }
          : contact.tags;
  }
  if (contact.status) {
    set.status = merge.allowStatusUpgrade
      ? contact.status
      : {
          $cond: [
            { $in: [{ $ifNull: ["$status", "subscribed"] }, ["unsubscribed", "bounced"]] },
            "$status",
            { $ifNull: ["$status", contact.status] },
          ],
        };
  } else {
    set.status = { $ifNull: ["$status", "subscribed"] };
  }

  return [{ $set: set }];
}

function emptyOr(value: string, existing: string): Record<string, unknown> {
  return {
    $cond: [{ $eq: [{ $ifNull: [existing, ""] }, ""] }, value, existing],
  };
}

function keepOrInsert(existing: string, value: string): Record<string, unknown> {
  return { $ifNull: [existing, value] };
}
