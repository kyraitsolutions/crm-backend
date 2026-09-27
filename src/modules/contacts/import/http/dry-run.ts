import { Types } from "mongoose";
import { ContactModel } from "../../../../models/contact.model.js";
import { parseCsvStream, type CsvDelimiter } from "../parser/csv-reader.js";
import { canonicalCsvKey } from "../parser/inspect-file.js";
import { mapRow } from "../pipeline/map-row.js";
import { validateRow } from "../pipeline/validate-row.js";
import type { FileStore } from "../store/file-store.js";
import type {
  ContactImportJobRecord,
  DryRunRequest,
  ImportIdentityConfig,
} from "../types/import.types.js";

export interface DryRunRowSample {
  rowNumber: number;
  raw: string[];
  normalized: Record<string, unknown>;
  errors?: Array<{ code: string; column?: string; rawValue?: string }>;
}

export interface DryRunResult {
  sampled: number;
  valid: number;
  invalid: number;
  byErrorCode: Record<string, number>;
  invalidSamples: DryRunRowSample[];
  validSamples: DryRunRowSample[];
  existingMatches: {
    count: number;
    phones: string[];
    emails: string[];
  };
}

export async function runImportDryRun(
  store: FileStore,
  job: ContactImportJobRecord,
  request: DryRunRequest,
): Promise<DryRunResult> {
  const sampleSize = request.sampleSize;
  const identity: ImportIdentityConfig = request.identity ?? { keys: ["phone", "email"] };
  const sourceKey =
    job.file.detected?.kind === "xlsx" ? canonicalCsvKey(job.file.key) : job.file.key;
  const delimiter = (job.file.detected?.delimiter ?? ",") as CsvDelimiter;
  const rows = await readHeadDataRows(store, sourceKey, delimiter, sampleSize);
  const byErrorCode: Record<string, number> = {};
  const invalidSamples: DryRunRowSample[] = [];
  const validSamples: DryRunRowSample[] = [];
  const phones: string[] = [];
  const emails: string[] = [];
  const wantPhone = identity.keys.includes("phone");
  const wantEmail = identity.keys.includes("email");
  let valid = 0;
  let invalid = 0;

  for (const row of rows) {
    const mapped = mapRow(row.fields, job.headers, request.mapping);
    const outcome = validateRow(mapped, row.fields, row.rowNumber, identity, request.defaultCountry);
    if (!outcome.ok) {
      invalid += 1;
      byErrorCode[outcome.error.reason] = (byErrorCode[outcome.error.reason] ?? 0) + 1;
      if (invalidSamples.length < 20) {
        invalidSamples.push({
          rowNumber: row.rowNumber,
          raw: row.fields,
          normalized: {
            name: mapped.name,
            email: mapped.email,
            phone: mapped.phone,
            status: mapped.status,
            tags: mapped.tags,
          },
          errors: [
            {
              code: outcome.error.reason,
              column: outcome.error.column,
              rawValue: outcome.error.rawValue,
            },
          ],
        });
      }
      continue;
    }
    valid += 1;
    if (wantPhone && outcome.contact.phone) {
      phones.push(outcome.contact.phone);
    }
    if (wantEmail && outcome.contact.email) {
      emails.push(outcome.contact.email);
    }
    if (validSamples.length < 10) {
      validSamples.push({
        rowNumber: row.rowNumber,
        raw: row.fields,
        normalized: {
          name: outcome.contact.name,
          email: outcome.contact.email,
          phone: outcome.contact.phone,
          status: outcome.contact.status,
          tags: outcome.contact.tags,
        },
      });
    }
  }

  const existingMatches = await findExistingMatches(job.accountId, phones, emails);
  return {
    sampled: rows.length,
    valid,
    invalid,
    byErrorCode,
    invalidSamples,
    validSamples,
    existingMatches,
  };
}

export async function readHeadDataRows(
  store: FileStore,
  key: string,
  delimiter: CsvDelimiter,
  sampleSize: number,
): Promise<Array<{ rowNumber: number; fields: string[] }>> {
  const stream = await store.createReadStream(key);
  const iterator = parseCsvStream(stream, {
    delimiter,
    skipHeader: true,
    firstRowNumber: 1,
  });
  const rows: Array<{ rowNumber: number; fields: string[] }> = [];
  try {
    for await (const row of iterator) {
      rows.push({ rowNumber: row.rowNumber, fields: row.fields });
      if (rows.length >= sampleSize) {
        break;
      }
    }
  } finally {
    await iterator.return?.(undefined);
    stream.destroy();
  }
  return rows;
}

async function findExistingMatches(
  accountId: string,
  phones: string[],
  emails: string[],
): Promise<{ count: number; phones: string[]; emails: string[] }> {
  const uniquePhones = [...new Set(phones.filter(Boolean))];
  const uniqueEmails = [...new Set(emails.filter(Boolean))];
  const filter: Record<string, unknown> = {
    accountId: new Types.ObjectId(accountId),
  };
  if (uniquePhones.length > 0 && uniqueEmails.length > 0) {
    filter.$or = [{ phone: { $in: uniquePhones } }, { email: { $in: uniqueEmails } }];
  } else if (uniquePhones.length > 0) {
    filter.phone = { $in: uniquePhones };
  } else if (uniqueEmails.length > 0) {
    filter.email = { $in: uniqueEmails };
  } else {
    return { count: 0, phones: [], emails: [] };
  }
  const docs = await ContactModel.find(filter).select({ phone: 1, email: 1 }).lean();
  return {
    count: docs.length,
    phones: docs.map((doc) => doc.phone).filter((value): value is string => Boolean(value)),
    emails: docs.map((doc) => doc.email).filter((value): value is string => Boolean(value)),
  };
}
