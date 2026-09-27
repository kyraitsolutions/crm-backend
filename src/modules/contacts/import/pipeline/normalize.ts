import { IMPORT_DEFAULT_REGION, IMPORT_MAX_CELL_BYTES } from "../constants/import.constant.js";
import { loadLibPhoneNumber } from "./libphonenumber-cjs.js";

const libphonenumber = loadLibPhoneNumber();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmailValue(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const email = value.trim().toLowerCase();
  if (email.length === 0) {
    return undefined;
  }
  return email;
}

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value);
}

export function normalizePhoneValue(
  value: string | undefined,
  defaultRegion: string = IMPORT_DEFAULT_REGION,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const raw = value.trim();
  if (raw.length === 0) {
    return undefined;
  }
  const parsed = libphonenumber.parsePhoneNumberFromString(raw, defaultRegion);
  // isValid() is assigned-range only. Sequential / placeholder mobiles
  // (e.g. +9190000000001) are isPossible() but not isValid() in IN metadata.
  if (!parsed || !parsed.isPossible()) {
    return undefined;
  }
  return parsed.format("E.164");
}

export function normalizePhone(
  value: string,
  defaultCountry: string = IMPORT_DEFAULT_REGION,
): string | undefined {
  return normalizePhoneValue(value, defaultCountry);
}

export function isE164(value: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(value);
}

export function cellTooLarge(value: string | undefined): boolean {
  if (value === undefined) {
    return false;
  }
  return Buffer.byteLength(value, "utf8") > IMPORT_MAX_CELL_BYTES;
}
