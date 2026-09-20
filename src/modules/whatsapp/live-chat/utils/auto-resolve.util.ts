import { AUTO_RESOLVE_SCHEDULE } from "../constants/live-chat.constant.js";

export type AutoResolveWindowConfig = {
  enabled?: boolean;
  mode?: string | null;
  scheduleMode?: string | null;
};

export const matchesAutoResolveWindow = (
  scheduleMode: string | undefined,
  withinHours: boolean,
) => {
  if (scheduleMode === AUTO_RESOLVE_SCHEDULE.ALWAYS) return true;
  if (scheduleMode === AUTO_RESOLVE_SCHEDULE.OFF_HOURS) return !withinHours;
  return withinHours;
};

export const autoResolveCoversWelcome = (autoResolve?: AutoResolveWindowConfig) =>
  Boolean(autoResolve?.enabled) &&
  (autoResolve?.scheduleMode === AUTO_RESOLVE_SCHEDULE.ALWAYS ||
    autoResolve?.scheduleMode === AUTO_RESOLVE_SCHEDULE.WORKING_HOURS ||
    !autoResolve?.scheduleMode);

export const autoResolveCoversOffHours = (autoResolve?: AutoResolveWindowConfig) =>
  Boolean(autoResolve?.enabled) &&
  (autoResolve?.scheduleMode === AUTO_RESOLVE_SCHEDULE.ALWAYS ||
    autoResolve?.scheduleMode === AUTO_RESOLVE_SCHEDULE.OFF_HOURS);

export const autoResolveWindowLabel = (scheduleMode?: string | null) => {
  if (scheduleMode === AUTO_RESOLVE_SCHEDULE.ALWAYS) return "always";
  if (scheduleMode === AUTO_RESOLVE_SCHEDULE.OFF_HOURS) return "outside working hours";
  return "during working hours";
};

export const autoResolveResolverLabel = (mode?: string | null) => {
  if (mode === "ai_agent") return "AI agent";
  if (mode === "flow") return "chatflow";
  return "auto resolve";
};
