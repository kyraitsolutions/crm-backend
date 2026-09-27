import { DEFAULT_AGENT_INSTRUCTIONS } from "../../whatsapp/ai-agent/constants/ai-agent.constant.js";
import {
  AI_AGENT_RESPONSE_LENGTH,
  AI_AGENT_SKILL_KEY,
  AI_AGENT_VOICE_PRESET,
} from "../constants/ai-agent.constant.js";
import {
  catalogItemToSkill,
  findSkillCatalogItem,
} from "../constants/skill-catalog.constant.js";
import type { TAiAgentConfig } from "../types/ai-agent.type.js";
import { createDefaultAgentConfig } from "./default-agent-config.util.js";

type LegacyWhatsAppConfig = {
  enabled?: boolean;
  instructions?: string;
  businessProfile?: {
    name?: string;
    industry?: string;
    description?: string;
    timezone?: string;
  };
  qualificationFields?: unknown[];
  intents?: unknown[];
  scoring?: Record<string, unknown>;
  discount?: Record<string, unknown>;
  escalation?: {
    onHumanRequest?: boolean;
    onUnknownInfo?: boolean;
    onComplaint?: boolean;
    onLowConfidence?: boolean;
    lowConfidenceThreshold?: number;
    customerMessage?: string;
  };
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

export const mergeLegacyWhatsAppConfig = (
  legacy: LegacyWhatsAppConfig | null | undefined,
): TAiAgentConfig => {
  const profile = legacy?.businessProfile || {};
  const escalation = legacy?.escalation || {};
  const instructions = String(
    legacy?.instructions || DEFAULT_AGENT_INSTRUCTIONS,
  ).trim();
  const groundRules = instructions
    ? instructions
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    : undefined;

  const base = createDefaultAgentConfig({
    identity: {
      name: String(profile.name || ""),
      website: "",
      greeting: "",
      description: String(profile.description || ""),
      industry: String(profile.industry || ""),
      timezone: String(profile.timezone || "Asia/Kolkata"),
    },
    groundRules,
    voice: {
      preset: AI_AGENT_VOICE_PRESET.PROFESSIONAL,
      customInstructions: instructions || "",
      responseLength: AI_AGENT_RESPONSE_LENGTH.MEDIUM,
      language: "en",
      interactiveReplies: true,
    },
    safety: {
      neverInventFacts: true,
      onHumanRequest: escalation.onHumanRequest !== false,
      onUnknownInfo: escalation.onUnknownInfo !== false,
      onComplaint: escalation.onComplaint !== false,
      onLowConfidence: escalation.onLowConfidence !== false,
      lowConfidenceThreshold: Number(escalation.lowConfidenceThreshold ?? 0.4),
      customerHandoffMessage: String(
        escalation.customerMessage ||
          "I'm connecting you with a team member who can help from here.",
      ),
    },
    legacyWhatsApp: asRecord(legacy),
  });

  const qualificationFields = Array.isArray(legacy?.qualificationFields)
    ? (legacy?.qualificationFields as Array<Record<string, unknown>>)
    : [];
  const collectFields = qualificationFields
    .map((field) => ({
      question: String(field.label || field.question || "").trim(),
      attribute: String(field.key || field.attribute || "").trim(),
      required: Boolean(field.required),
    }))
    .filter((field) => field.question && field.attribute);

  const skills = [...base.skills];
  if (collectFields.length) {
    const catalog = findSkillCatalogItem(AI_AGENT_SKILL_KEY.LEAD_QUALIFICATION);
    const lead =
      skills.find((skill) => skill.key === AI_AGENT_SKILL_KEY.LEAD_QUALIFICATION) ||
      (catalog ? catalogItemToSkill(catalog) : null);
    if (lead) {
      const nextLead = {
        ...lead,
        enabled: true,
        type: lead.type || lead.key,
        whenToUse: lead.whenToUse || lead.instructions,
        config: {
          ...lead.config,
          qualificationFields,
          collectFields,
          connectedToolKeys: lead.config?.connectedToolKeys || [],
          intents: legacy?.intents || [],
          scoring: legacy?.scoring || {},
          discount: legacy?.discount || {},
        },
      };
      const index = skills.findIndex(
        (skill) => skill.key === AI_AGENT_SKILL_KEY.LEAD_QUALIFICATION,
      );
      if (index >= 0) skills[index] = nextLead;
      else skills.push(nextLead);
    }
  }

  return {
    ...base,
    skills,
  };
};
