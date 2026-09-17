export const normalizeEmail = (
  email?: string | null,
): string | undefined => {
  const value = String(email || "").trim().toLowerCase();
  if (!value || !value.includes("@")) {
    return undefined;
  }
  return value;
};

export const normalizePhone = (
  phone?: string | null,
): string | undefined => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length < 10) {
    return undefined;
  }
  return digits;
};

/** National last-10 digits so CRM contacts match the 10-digit contact form. */
export const toStoredPhone = (
  phone?: string | null,
): string | undefined => {
  const digits = normalizePhone(phone);
  if (!digits) {
    return undefined;
  }
  return digits.slice(-10);
};

/**
 * Store CRM/WhatsApp numbers with country code (E.164).
 * 10-digit national numbers default to India (+91).
 */
export const toContactPhone = (
  phone?: string | null,
): string | undefined => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length < 10) {
    return undefined;
  }
  const withCountry = digits.length === 10 ? `91${digits}` : digits;
  return `+${withCountry}`;
};

export const toWhatsAppPhone = toContactPhone;

export const phoneMatchValues = (phone?: string | null): string[] => {
  const normalized = normalizePhone(phone);
  if (!normalized) {
    return [];
  }

  const last10 = normalized.slice(-10);
  const withIndia = last10.length === 10 ? `91${last10}` : normalized;
  return Array.from(
    new Set(
      [
        normalized,
        last10,
        withIndia,
        `+${normalized}`,
        `+${withIndia}`,
      ].filter(Boolean),
    ),
  );
};
