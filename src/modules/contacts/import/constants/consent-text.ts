export const IMPORT_CONSENT_TEXT_VERSION = "import-consent-v1";

export const IMPORT_CONSENT_TEXTS: Record<string, string> = {
  [IMPORT_CONSENT_TEXT_VERSION]:
    "I confirm these contacts consented to receive marketing messages, and I am authorised to import them. Existing contacts keep their current consent and opt-out settings.",
};

export function currentConsentText(): { version: string; text: string } {
  return {
    version: IMPORT_CONSENT_TEXT_VERSION,
    text: IMPORT_CONSENT_TEXTS[IMPORT_CONSENT_TEXT_VERSION] ?? "",
  };
}
