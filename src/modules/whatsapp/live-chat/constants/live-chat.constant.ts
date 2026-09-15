export const AUTO_RESOLVE_MODE = {
  FLOW: "flow",
  AI_AGENT: "ai_agent",
} as const;

export const AUTO_RESOLVE_SCHEDULE = {
  WORKING_HOURS: "working_hours",
  OFF_HOURS: "off_hours",
  ALWAYS: "always",
} as const;

export const AUTO_REPLY_TYPE = {
  TEXT: "text",
  TEMPLATE: "template",
} as const;

export const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export const DEFAULT_WELCOME_TEXT =
  "Hi! Thanks for connecting. Someone from our team will get in touch soon.";

export const DEFAULT_OFF_HOURS_TEXT =
  "Hi! Thanks for connecting. Our team is unavailable right now. We'll be back during working hours.";

export const DEFAULT_WORKING_HOURS = {
  timezone: "Asia/Kolkata",
  days: [
    { day: "Mon", enabled: true, from: "09:00", to: "18:00" },
    { day: "Tue", enabled: true, from: "09:00", to: "18:00" },
    { day: "Wed", enabled: true, from: "09:00", to: "18:00" },
    { day: "Thu", enabled: true, from: "09:00", to: "18:00" },
    { day: "Fri", enabled: true, from: "09:00", to: "18:00" },
    { day: "Sat", enabled: false, from: "09:00", to: "18:00" },
    { day: "Sun", enabled: false, from: "09:00", to: "18:00" },
  ],
};
