import { IMPORT_FIELD_TARGET } from "../constants/import.constant.js";

type ImportFieldTargetValue = (typeof IMPORT_FIELD_TARGET)[keyof typeof IMPORT_FIELD_TARGET];

const SYNONYMS: Array<{ target: Exclude<ImportFieldTargetValue, "ignore">; names: string[] }> = [
  {
    target: IMPORT_FIELD_TARGET.PHONE,
    names: [
      "phone",
      "mobile",
      "mobile number",
      "phone number",
      "phonenumber",
      "whatsapp",
      "whatsapp number",
      "cell",
      "cellphone",
      "tel",
      "telephone",
    ],
  },
  {
    target: IMPORT_FIELD_TARGET.EMAIL,
    names: ["email", "e-mail", "mail", "email address", "emailaddress"],
  },
  {
    target: IMPORT_FIELD_TARGET.NAME,
    names: ["name", "full name", "fullname", "contact name", "contactname", "customer name"],
  },
  {
    target: IMPORT_FIELD_TARGET.TAGS,
    names: ["tags", "tag", "labels", "label"],
  },
  {
    target: IMPORT_FIELD_TARGET.STATUS,
    names: ["status", "subscription", "subscription status"],
  },
  {
    target: IMPORT_FIELD_TARGET.WHATSAPP_OPT_IN,
    names: ["opt in", "optin", "whatsapp opt in", "whatsapp optin", "marketing opt in"],
  },
];

export function normalizeImportHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[_./-]+/g, " ").replace(/\s+/g, " ");
}

function headerMatches(normalized: string, name: string): boolean {
  if (normalized === name) {
    return true;
  }
  const words = normalized.split(" ");
  const nameWords = name.split(" ");
  if (nameWords.length === 1) {
    return words.includes(name);
  }
  return normalized.includes(name);
}

export function suggestMapping(
  headers: string[],
): Array<{ source: string; target: ImportFieldTargetValue }> {
  const used = new Set<string>();
  return headers.map((source) => {
    const normalized = normalizeImportHeader(source);
    const match = SYNONYMS.find(
      (entry) =>
        !used.has(entry.target) &&
        entry.names.some((name) => headerMatches(normalized, name)),
    );
    if (!match) {
      return { source, target: IMPORT_FIELD_TARGET.IGNORE };
    }
    used.add(match.target);
    return { source, target: match.target };
  });
}
