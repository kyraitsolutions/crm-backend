import { HttpError } from "../../../utils/http.error.js";
import {
  AI_AGENT_RESPONSE_LENGTH,
  AI_AGENT_SKILL_KEY,
  AI_AGENT_TOOL_SENSITIVITY,
  AI_AGENT_TOOL_TYPE,
  AI_AGENT_VOICE_PRESET,
} from "../constants/ai-agent.constant.js";
import { isBuiltInSkillType, isAllowedSkillIcon } from "../constants/skill-catalog.constant.js";
import { skillsArraySchema } from "../schemas/skill.schema.js";
import type { TAiAgentConfig } from "../types/ai-agent.type.js";

const VOICE_PRESETS = Object.values(AI_AGENT_VOICE_PRESET);
const RESPONSE_LENGTHS = Object.values(AI_AGENT_RESPONSE_LENGTH);
const TOOL_TYPES = Object.values(AI_AGENT_TOOL_TYPE);
const TOOL_SENSITIVITIES = Object.values(AI_AGENT_TOOL_SENSITIVITY);

const asObject = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
};

const asString = (value: unknown, fallback = "") =>
  value == null ? fallback : String(value);

const asBoolean = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

const asNumber = (value: unknown, fallback: number) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
};

const asStringArray = (value: unknown, fallback: string[]) => {
  if (!Array.isArray(value)) return fallback;
  return value.map((item) => String(item || "").trim()).filter(Boolean);
};

export class CreateAiAgentDto {
  name: string;
  industry: string;
  website: string;
  timezone: string;
  greeting: string;
  description: string;
  skillTypes: string[];
  groundRules: string[];

  constructor(payload: Record<string, unknown> = {}) {
    const identity = asObject(payload.identity || payload);
    this.name = asString(identity.name || payload.name).trim();
    this.industry = asString(identity.industry).trim();
    this.website = asString(identity.website).trim();
    this.timezone = asString(identity.timezone, "Asia/Kolkata").trim() || "Asia/Kolkata";
    this.greeting = asString(identity.greeting).trim();
    this.description = asString(identity.description).trim();
    this.skillTypes = asStringArray(payload.skillTypes, []).filter((type) =>
      isBuiltInSkillType(type),
    );
    this.groundRules = asStringArray(payload.groundRules, []);
    if (!this.name) {
      throw HttpError.badRequest("Add a business name to create the agent.");
    }
  }
}

export class UpdateAiAgentDraftDto {
  name?: string;
  config: Partial<TAiAgentConfig>;

  constructor(data: Record<string, unknown>) {
    if (data.name != null) this.name = asString(data.name).trim();
    this.config = this.normalizeConfig(asObject(data.config ?? data));
  }

  private normalizeConfig(payload: Record<string, unknown>): Partial<TAiAgentConfig> {
    const next: Partial<TAiAgentConfig> = {};

    if (payload.identity) {
      const identity = asObject(payload.identity);
      next.identity = {
        name: asString(identity.name),
        website: asString(identity.website),
        greeting: asString(identity.greeting),
        description: asString(identity.description),
        industry: asString(identity.industry),
        timezone: asString(identity.timezone, "Asia/Kolkata"),
      };
    }

    if (payload.groundRules !== undefined) {
      next.groundRules = asStringArray(payload.groundRules, []);
    }

    if (payload.voice) {
      const voice = asObject(payload.voice);
      const preset = asString(voice.preset, AI_AGENT_VOICE_PRESET.PROFESSIONAL);
      if (!VOICE_PRESETS.includes(preset as (typeof VOICE_PRESETS)[number])) {
        throw HttpError.badRequest("Invalid voice preset");
      }
      const responseLength = asString(
        voice.responseLength,
        AI_AGENT_RESPONSE_LENGTH.MEDIUM,
      );
      if (
        !RESPONSE_LENGTHS.includes(
          responseLength as (typeof RESPONSE_LENGTHS)[number],
        )
      ) {
        throw HttpError.badRequest("Invalid response length");
      }
      next.voice = {
        preset: preset as TAiAgentConfig["voice"]["preset"],
        customInstructions: asString(voice.customInstructions),
        responseLength: responseLength as TAiAgentConfig["voice"]["responseLength"],
        language: asString(voice.language, "en"),
        interactiveReplies: asBoolean(voice.interactiveReplies, true),
      };
    }

    if (payload.skills !== undefined) {
      if (!Array.isArray(payload.skills)) {
        throw HttpError.badRequest("Skills must be an array");
      }
      const normalized = payload.skills.map((item) => this.normalizeSkill(item));
      const parsed = skillsArraySchema.safeParse(normalized);
      if (!parsed.success) {
        const message = parsed.error.issues[0]?.message || "Invalid skill configuration";
        throw HttpError.badRequest(message);
      }
      next.skills = parsed.data;
    }

    if (payload.tools !== undefined) {
      if (!Array.isArray(payload.tools)) {
        throw HttpError.badRequest("Tools must be an array");
      }
      next.tools = payload.tools.map((item) => {
        const tool = asObject(item);
        const type = asString(tool.type, AI_AGENT_TOOL_TYPE.SYSTEM);
        const sensitivity = asString(
          tool.sensitivity,
          AI_AGENT_TOOL_SENSITIVITY.READ_ONLY,
        );
        if (!TOOL_TYPES.includes(type as (typeof TOOL_TYPES)[number])) {
          throw HttpError.badRequest(`Invalid tool type: ${type}`);
        }
        if (
          !TOOL_SENSITIVITIES.includes(
            sensitivity as (typeof TOOL_SENSITIVITIES)[number],
          )
        ) {
          throw HttpError.badRequest(`Invalid tool sensitivity: ${sensitivity}`);
        }
        return {
          key: asString(tool.key),
          name: asString(tool.name),
          type: type as TAiAgentConfig["tools"][number]["type"],
          enabled: asBoolean(tool.enabled, true),
          sensitivity:
            sensitivity as TAiAgentConfig["tools"][number]["sensitivity"],
          description: asString(tool.description),
          config: asObject(tool.config),
        };
      });
    }

    if (payload.knowledgeSourceIds !== undefined) {
      next.knowledgeSourceIds = asStringArray(payload.knowledgeSourceIds, []);
    }

    if (payload.safety) {
      const safety = asObject(payload.safety);
      next.safety = {
        neverInventFacts: asBoolean(safety.neverInventFacts, true),
        onHumanRequest: asBoolean(safety.onHumanRequest, true),
        onUnknownInfo: asBoolean(safety.onUnknownInfo, true),
        onComplaint: asBoolean(safety.onComplaint, true),
        onLowConfidence: asBoolean(safety.onLowConfidence, true),
        lowConfidenceThreshold: asNumber(safety.lowConfidenceThreshold, 0.4),
        customerHandoffMessage: asString(safety.customerHandoffMessage),
      };
    }

    return next;
  }

  private normalizeSkill(item: unknown) {
    const skill = asObject(item);
    const key = asString(skill.key);
    const typeRaw = asString(skill.type || skill.key);
    const type =
      typeRaw === AI_AGENT_SKILL_KEY.CUSTOM || isBuiltInSkillType(typeRaw)
        ? typeRaw
        : isBuiltInSkillType(key)
          ? key
          : AI_AGENT_SKILL_KEY.CUSTOM;
    const config = asObject(skill.config);
    const collectFromLegacy = Array.isArray(config.qualificationFields)
      ? (config.qualificationFields as unknown[])
          .map((field) => {
            const row = asObject(field);
            return {
              question: asString(row.question || row.label),
              attribute: asString(row.attribute || row.key),
              required: asBoolean(row.required, false),
            };
          })
          .filter((row) => row.question && row.attribute)
      : [];
    const collectFields = (
      Array.isArray(config.collectFields) ? config.collectFields : collectFromLegacy
    )
      .map((field) => {
        const row = asObject(field);
        return {
          question: asString(row.question || row.label).trim(),
          attribute: asString(row.attribute || row.key).trim(),
          required: asBoolean(row.required, false),
        };
      })
      .filter((row) => row.question && row.attribute);
    const connectedToolKeys = asStringArray(
      config.connectedToolKeys ?? skill.connectedToolKeys,
      [],
    );
    const iconRaw = asString(skill.icon, "zap") || "zap";
    return {
      key: key || type,
      type,
      enabled: asBoolean(skill.enabled, true),
      name: asString(skill.name),
      icon: isAllowedSkillIcon(iconRaw) ? iconRaw : "zap",
      whenToUse: asString(skill.whenToUse),
      instructions: asString(skill.instructions),
      config: {
        ...config,
        collectFields,
        connectedToolKeys,
      },
    };
  }
}
