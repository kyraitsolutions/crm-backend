import {
  DEFAULT_MERGE_EMPTY_ONLY,
  DUPLICATE_POLICY,
  IMPORT_ALLOWED_MIME_TYPES,
  IMPORT_FIELD_TRANSFORM,
  IMPORT_MAX_FILE_BYTES,
  IMPORT_MAX_ROWS,
} from "../constants/import.constant.js";
import { currentConsentText } from "../constants/consent-text.js";
import { readOrganizationCountry } from "./organization-country.js";

export async function buildImportConfig(organizationId: string) {
  return {
    limits: {
      maxFileBytes: IMPORT_MAX_FILE_BYTES,
      maxRows: IMPORT_MAX_ROWS,
      allowedTypes: [".csv", ".xlsx"],
      allowedMimeTypes: [...IMPORT_ALLOWED_MIME_TYPES],
      sheetSupport: {
        csv: false,
        xlsx: true,
        firstVisibleSheet: true,
      },
    },
    fields: [
      {
        key: "name",
        label: "Name",
        type: "string",
        allowedTransforms: [IMPORT_FIELD_TRANSFORM.NONE, IMPORT_FIELD_TRANSFORM.TRIM, IMPORT_FIELD_TRANSFORM.LOWERCASE],
        identityKey: false,
      },
      {
        key: "email",
        label: "Email",
        type: "string",
        allowedTransforms: [IMPORT_FIELD_TRANSFORM.NONE, IMPORT_FIELD_TRANSFORM.TRIM, IMPORT_FIELD_TRANSFORM.LOWERCASE],
        identityKey: true,
      },
      {
        key: "phone",
        label: "Phone",
        type: "string",
        allowedTransforms: [IMPORT_FIELD_TRANSFORM.NONE, IMPORT_FIELD_TRANSFORM.TRIM],
        identityKey: true,
      },
      {
        key: "status",
        label: "Status",
        type: "enum",
        allowedTransforms: [IMPORT_FIELD_TRANSFORM.NONE, IMPORT_FIELD_TRANSFORM.TRIM, IMPORT_FIELD_TRANSFORM.LOWERCASE],
        identityKey: false,
      },
      {
        key: "tags",
        label: "Tags",
        type: "string[]",
        allowedTransforms: [IMPORT_FIELD_TRANSFORM.NONE, IMPORT_FIELD_TRANSFORM.TRIM],
        identityKey: false,
      },
      {
        key: "whatsapp.optIn",
        label: "WhatsApp opt-in",
        type: "boolean",
        allowedTransforms: [IMPORT_FIELD_TRANSFORM.NONE, IMPORT_FIELD_TRANSFORM.TRIM, IMPORT_FIELD_TRANSFORM.LOWERCASE],
        identityKey: false,
      },
      {
        key: "ignore",
        label: "Ignore",
        type: "none",
        allowedTransforms: [IMPORT_FIELD_TRANSFORM.NONE],
        identityKey: false,
      },
    ],
    policies: [
      {
        key: DUPLICATE_POLICY.SKIP,
        description: "Leave the existing contact unchanged when a match is found.",
      },
      {
        key: DUPLICATE_POLICY.UPDATE,
        description: "Overwrite mapped fields on the existing contact. Consent and opt-out are never changed.",
      },
      {
        key: DUPLICATE_POLICY.MERGE,
        description: "Fill empty mapped fields only. Tags can union or replace. Consent and opt-out stay as-is.",
      },
    ],
    merge: {
      emptyOnly: [...DEFAULT_MERGE_EMPTY_ONLY],
      tags: ["union", "replace"],
      allowStatusUpgrade: false,
    },
    consentText: currentConsentText(),
    defaultCountry: await readOrganizationCountry(organizationId),
  };
}
