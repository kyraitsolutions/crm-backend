import type { MetaLeadgenField } from "../types/leadgen.types.js";

const FIRST_VALUE = (fields: Map<string, string>, ...keys: string[]) => {
  for (const key of keys) {
    const value = fields.get(key);
    if (value) return value;
  }
  return "";
};

export const mapLeadgenFields = (fieldData: MetaLeadgenField[] = []) => {
  const fields = new Map<string, string>();
  const customFields: Record<string, string> = {};

  for (const field of fieldData) {
    const key = String(field?.name || "")
      .trim()
      .toLowerCase();
    const value = Array.isArray(field?.values)
      ? field.values.filter(Boolean).join(" ").trim()
      : "";

    if (!key || !value) continue;
    fields.set(key, value);
  }

  const firstName = FIRST_VALUE(fields, "first_name", "firstname");
  const lastName = FIRST_VALUE(fields, "last_name", "lastname");
  const fullName = FIRST_VALUE(fields, "full_name", "name", "full name");

  const mapped = {
    name: fullName || [firstName, lastName].filter(Boolean).join(" ").trim(),
    email: FIRST_VALUE(
      fields,
      "email",
      "email_address",
      "work_email",
      "e-mail",
    ).toLowerCase(),
    phone: FIRST_VALUE(
      fields,
      "phone_number",
      "phone",
      "work_phone_number",
      "mobile_number",
    ),
    mobile: FIRST_VALUE(fields, "mobile", "mobile_number", "cell_phone"),
    company: FIRST_VALUE(fields, "company_name", "company", "business_name"),
    title: FIRST_VALUE(fields, "job_title", "title", "work_title"),
    website: FIRST_VALUE(fields, "website", "work_website", "url"),
    message: FIRST_VALUE(fields, "message", "comments", "notes"),
    city: FIRST_VALUE(fields, "city"),
    country: FIRST_VALUE(fields, "country"),
    address: FIRST_VALUE(
      fields,
      "street_address",
      "address",
      "address_line_1",
    ),
  };

  const mappedKeys = new Set([
    "full_name",
    "name",
    "full name",
    "first_name",
    "firstname",
    "last_name",
    "lastname",
    "email",
    "email_address",
    "work_email",
    "e-mail",
    "phone_number",
    "phone",
    "work_phone_number",
    "mobile_number",
    "mobile",
    "cell_phone",
    "company_name",
    "company",
    "business_name",
    "job_title",
    "title",
    "work_title",
    "website",
    "work_website",
    "url",
    "message",
    "comments",
    "notes",
    "city",
    "country",
    "street_address",
    "address",
    "address_line_1",
  ]);

  for (const [key, value] of fields.entries()) {
    if (!mappedKeys.has(key)) {
      customFields[key] = value;
    }
  }

  return { mapped, customFields };
};

export const parseLeadgenCreatedTime = (
  value?: number | string | null,
): Date | null => {
  if (value == null || value === "") return null;

  if (typeof value === "number") {
    return new Date(value > 1e12 ? value : value * 1000);
  }

  const asNumber = Number(value);
  if (!Number.isNaN(asNumber) && /^\d+$/.test(String(value))) {
    return new Date(asNumber > 1e12 ? asNumber : asNumber * 1000);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};
