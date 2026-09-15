import { HttpError } from "../../../../utils/http.error.js";
import {
  AUTO_REPLY_TYPE,
  AUTO_RESOLVE_MODE,
  AUTO_RESOLVE_SCHEDULE,
  WEEK_DAYS,
} from "../constants/live-chat.constant.js";
import { parseTimeToMinutes } from "../utils/working-hours.util.js";

const AUTO_RESOLVE_MODES = Object.values(AUTO_RESOLVE_MODE);
const SCHEDULE_MODES = Object.values(AUTO_RESOLVE_SCHEDULE);
const REPLY_TYPES = Object.values(AUTO_REPLY_TYPE);

const normalizeReply = (payload: Record<string, any> | undefined) => {
  if (!payload || typeof payload !== "object") return undefined;
  const type = payload.type ? String(payload.type) : undefined;
  if (type && !REPLY_TYPES.includes(type as (typeof REPLY_TYPES)[number])) {
    throw HttpError.badRequest("Unsupported auto-reply type");
  }
  return {
    enabled: payload.enabled,
    type,
    text: payload.text != null ? String(payload.text) : undefined,
    templateId: payload.templateId != null ? String(payload.templateId) : undefined,
    templateName: payload.templateName != null ? String(payload.templateName) : undefined,
    language: payload.language != null ? String(payload.language) : undefined,
  };
};

export class UpdateWhatsAppLiveChatDto {
  autoResolve?: {
    enabled?: boolean;
    mode?: string | null;
    chatFlowId?: string | null;
    aiAgentId?: string | null;
    scheduleMode?: string;
  };
  workingHours?: {
    timezone?: string;
    days?: { day: string; enabled: boolean; from: string; to: string }[];
  };
  welcomeMessage?: ReturnType<typeof normalizeReply>;
  offHoursMessage?: ReturnType<typeof normalizeReply>;

  constructor(data: Record<string, any>) {
    if (data.autoResolve) {
      const mode = data.autoResolve.mode;
      if (mode != null && mode !== "" && !AUTO_RESOLVE_MODES.includes(mode)) {
        throw HttpError.badRequest("Auto resolve mode must be flow or ai_agent");
      }
      if (
        data.autoResolve.scheduleMode &&
        !SCHEDULE_MODES.includes(data.autoResolve.scheduleMode)
      ) {
        throw HttpError.badRequest("Invalid auto resolve schedule");
      }
      this.autoResolve = {
        enabled: data.autoResolve.enabled,
        mode: mode === "" ? null : mode,
        chatFlowId: data.autoResolve.chatFlowId,
        aiAgentId: data.autoResolve.aiAgentId,
        scheduleMode: data.autoResolve.scheduleMode,
      };
    }

    if (data.workingHours) {
      const timezone = String(data.workingHours.timezone || "").trim();
      if (!timezone) throw HttpError.badRequest("Timezone is required");
      const days = Array.isArray(data.workingHours.days)
        ? data.workingHours.days
        : [];
      if (days.length) {
        for (const day of days) {
          if (!WEEK_DAYS.includes(day.day)) {
            throw HttpError.badRequest(`Invalid weekday: ${day.day}`);
          }
          if (day.enabled) {
            if (parseTimeToMinutes(day.from) == null) {
              throw HttpError.badRequest(`Invalid start time for ${day.day}`);
            }
            if (parseTimeToMinutes(day.to) == null) {
              throw HttpError.badRequest(`Invalid end time for ${day.day}`);
            }
          }
        }
      }
      this.workingHours = { timezone, days };
    }

    this.welcomeMessage = normalizeReply(data.welcomeMessage);
    this.offHoursMessage = normalizeReply(data.offHoursMessage);
  }
}
