import { IMPORT_ROW_REASON } from "../constants/import.constant.js";
import type { IdentityField, ImportIdentityConfig, ImportRowError } from "../types/import.types.js";
import type { MappedRow } from "./map-row.js";
import {
  cellTooLarge,
  isValidEmail,
  normalizeEmailValue,
  normalizePhoneValue,
} from "./normalize.js";

export interface ValidatedContact {
  name?: string;
  email?: string;
  phone?: string;
  status?: "subscribed" | "unsubscribed" | "bounced";
  tags?: string[];
  whatsappOptIn?: boolean;
  identityField: IdentityField;
  identityValue: string;
}

export type RowOutcome =
  | { ok: true; contact: ValidatedContact }
  | { ok: false; error: ImportRowError };

export function validateRow(
  mapped: MappedRow,
  raw: string[],
  rowNumber: number,
  identity: ImportIdentityConfig,
  defaultRegion: string,
): RowOutcome {
  for (const [target, column] of Object.entries(mapped.sourceColumn)) {
    const value = readMapped(mapped, target);
    if (typeof value === "string" && cellTooLarge(value)) {
      return fail(rowNumber, IMPORT_ROW_REASON.CELL_TOO_LARGE, raw, column, value);
    }
  }

  const phone = normalizePhoneValue(mapped.phone, defaultRegion);
  const emailRaw = normalizeEmailValue(mapped.email);
  const emailValid = emailRaw !== undefined && isValidEmail(emailRaw);
  const email = emailValid ? emailRaw : undefined;

  if (mapped.phone !== undefined && mapped.phone.trim() !== "" && phone === undefined) {
    return fail(
      rowNumber,
      IMPORT_ROW_REASON.INVALID_PHONE,
      raw,
      mapped.sourceColumn.phone,
      mapped.phone,
    );
  }

  const emailIsSoleIdentity =
    identity.keys.length === 1 && identity.keys[0] === "email";
  if (emailRaw !== undefined && !emailValid) {
    if (emailIsSoleIdentity || phone === undefined) {
      return fail(
        rowNumber,
        IMPORT_ROW_REASON.INVALID_EMAIL,
        raw,
        mapped.sourceColumn.email,
        mapped.email,
      );
    }
  }

  let identityField: IdentityField | undefined;
  let identityValue: string | undefined;
  for (const key of identity.keys) {
    if (key === "phone" && phone) {
      identityField = "phone";
      identityValue = phone;
      break;
    }
    if (key === "email" && email) {
      identityField = "email";
      identityValue = email;
      break;
    }
  }
  if (!identityField || !identityValue) {
    return fail(rowNumber, IMPORT_ROW_REASON.INVALID_IDENTITY, raw);
  }

  const statusValue = mapped.status?.trim().toLowerCase();
  return {
    ok: true,
    contact: {
      name: mapped.name?.trim() || undefined,
      email,
      phone,
      status:
        statusValue === "subscribed" ||
        statusValue === "unsubscribed" ||
        statusValue === "bounced"
          ? statusValue
          : undefined,
      tags: mapped.tags,
      whatsappOptIn: mapped.whatsappOptIn,
      identityField,
      identityValue,
    },
  };
}

function readMapped(mapped: MappedRow, target: string): string | undefined {
  switch (target) {
    case "name":
      return mapped.name;
    case "email":
      return mapped.email;
    case "phone":
      return mapped.phone;
    case "status":
      return mapped.status;
    default:
      return undefined;
  }
}

function fail(
  rowNumber: number,
  reason: string,
  raw: string[],
  column?: string,
  rawValue?: string,
): RowOutcome {
  return {
    ok: false,
    error: { rowNumber, reason, column, rawValue, raw },
  };
}
