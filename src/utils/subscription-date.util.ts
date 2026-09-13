export function utcNow(): Date {
  return new Date();
}

export function addDaysUtc(from: Date, days: number): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

export function addMonthsUtc(from: Date, months: number): Date {
  const result = new Date(from.getTime());
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

export function daysRemaining(endAt: Date | string | null | undefined, now = utcNow()): number {
  if (!endAt) return 0;
  const end = new Date(endAt);
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

export function isPast(date: Date | string | null | undefined, now = utcNow()): boolean {
  if (!date) return false;
  return new Date(date).getTime() <= now.getTime();
}
