type DaySchedule = {
  day: string;
  enabled: boolean;
  from: string;
  to: string;
};

type WorkingHours = {
  timezone?: string;
  days?: DaySchedule[];
};

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const parseTimeToMinutes = (value: string): number | null => {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const match = raw.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridian = match[3]?.toUpperCase();

  if (Number.isNaN(hours) || Number.isNaN(minutes) || minutes > 59) return null;

  if (meridian) {
    if (hours < 1 || hours > 12) return null;
    if (meridian === "AM") hours = hours === 12 ? 0 : hours;
    if (meridian === "PM") hours = hours === 12 ? 12 : hours + 12;
  } else if (hours > 23) {
    return null;
  }

  return hours * 60 + minutes;
};

const zonedParts = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }

  return {
    weekday: map.weekday,
    hour: Number(map.hour === "24" ? "0" : map.hour),
    minute: Number(map.minute),
  };
};

const normalizeWeekday = (value: string) => {
  const short = String(value || "").replace(".", "").slice(0, 3);
  const match = WEEKDAY_SHORT.find(
    (day) => day.toLowerCase() === short.toLowerCase(),
  );
  return match || null;
};

export const isWithinWorkingHours = (
  workingHours: WorkingHours | undefined,
  at: Date = new Date(),
): boolean => {
  const timezone = workingHours?.timezone || "Asia/Kolkata";
  const days = workingHours?.days || [];
  if (!days.length) return false;

  let weekday: string | null;
  let minutes: number;

  try {
    const parts = zonedParts(at, timezone);
    weekday = normalizeWeekday(parts.weekday);
    minutes = parts.hour * 60 + parts.minute;
  } catch {
    weekday = WEEKDAY_SHORT[at.getUTCDay()];
    minutes = at.getUTCHours() * 60 + at.getUTCMinutes();
  }

  if (weekday == null || Number.isNaN(minutes)) return false;

  const schedule = days.find((item) => normalizeWeekday(item.day) === weekday);
  if (!schedule?.enabled) return false;

  const from = parseTimeToMinutes(schedule.from);
  const to = parseTimeToMinutes(schedule.to);
  if (from == null || to == null) return false;

  if (from === to) return true;
  if (from < to) return minutes >= from && minutes < to;
  return minutes >= from || minutes < to;
};
