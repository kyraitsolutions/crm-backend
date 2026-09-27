const INTEGER_EPS = 1e-9;

export function formatExcelNumber(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return "";
  }
  if (/^-?\d+$/.test(trimmed)) {
    return trimmed;
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    return trimmed;
  }
  if (isIntegerValued(value) && Math.abs(value) < Number.MAX_SAFE_INTEGER) {
    return String(Math.round(value));
  }
  if (isIntegerValued(value)) {
    return value.toLocaleString("en-US", { useGrouping: false, maximumFractionDigits: 0 });
  }
  const formatted = value.toLocaleString("en-US", {
    useGrouping: false,
    maximumFractionDigits: 15,
  });
  return formatted;
}

function isIntegerValued(value: number): boolean {
  if (Number.isInteger(value)) {
    return true;
  }
  return Math.abs(value - Math.round(value)) < INTEGER_EPS;
}
