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

export const phoneMatchValues = (phone?: string | null): string[] => {
  const normalized = normalizePhone(phone);
  if (!normalized) {
    return [];
  }

  const last10 = normalized.slice(-10);
  return Array.from(
    new Set([normalized, last10, `91${last10}`].filter(Boolean)),
  );
};
