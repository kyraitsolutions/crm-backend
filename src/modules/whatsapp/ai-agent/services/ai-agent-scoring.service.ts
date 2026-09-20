import { HIGH_INTENT_KEYS } from "../constants/ai-agent.constant.js";
import type { WhatsAppAiAgentConfig } from "../models/whatsapp-ai-agent-config.model.js";

export type ScoreResult = {
  score: number;
  level: string;
  factors: string[];
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const customValue = (lead: any, key: string) => {
  const fields = lead?.customFields;
  if (!fields) return "";
  if (typeof fields.get === "function") return fields.get(key);
  return fields[key];
};

const hasValue = (value: unknown) =>
  value !== undefined && value !== null && String(value).trim() !== "";

export class AiAgentScoringService {
  calculate(params: {
    config: WhatsAppAiAgentConfig;
    lead: any;
    intent: string;
    inboundCount: number;
    requestedDiscount?: number | null;
    buyingStage?: string;
  }): ScoreResult {
    const weights = params.config.scoring?.weights || {};
    const fields = params.config.qualificationFields || [];
    const required = fields.filter((field) => field.required);
    const filledRequired = required.filter((field) =>
      hasValue(customValue(params.lead, field.key) ?? params.lead?.[field.key]),
    );
    const completeness =
      required.length === 0 ? 1 : filledRequired.length / required.length;

    const factors: string[] = [];
    let score = 0;

    const completenessPoints = completeness * Number(weights.requiredFieldsFilled || 0);
    score += completenessPoints;
    if (completeness >= 1 && required.length) {
      factors.push("Required qualification fields complete");
    } else if (filledRequired.length) {
      factors.push(
        `${filledRequired.length}/${required.length} required fields collected`,
      );
    }

    const intentKey = String(params.intent || "").toUpperCase();
    if (HIGH_INTENT_KEYS.includes(intentKey) || /book|buy|pay|demo|visit/i.test(intentKey)) {
      score += Number(weights.highIntent || 0);
      factors.push("High purchase or booking intent");
    }

    const timeline =
      customValue(params.lead, "timeline") ||
      customValue(params.lead, "check_in") ||
      customValue(params.lead, "date");
    if (hasValue(timeline)) {
      score += Number(weights.timeline || 0);
      factors.push("Timeline provided");
    }

    const budget = customValue(params.lead, "budget");
    if (hasValue(budget)) {
      score += Number(weights.budget || 0);
      factors.push("Budget provided");
    }

    if (params.inboundCount >= 3) {
      score += Number(weights.engagement || 0);
      factors.push("Repeat interaction");
    } else if (params.inboundCount >= 2) {
      score += Number(weights.engagement || 0) * 0.5;
      factors.push("Customer engaged in conversation");
    }

    if (/payment|pricing|negotiat/i.test(intentKey) || params.requestedDiscount) {
      score += 5;
      factors.push("Pricing discussion");
    }

    if (/demo|visit|tour/i.test(intentKey)) {
      score += 5;
      factors.push("Requested demo or visit");
    }

    const finalScore = clamp(score);
    const levels = params.config.scoring?.levels || [];
    const level =
      levels.find((item) => finalScore >= item.min && finalScore <= item.max)?.level ||
      (finalScore >= 81 ? "QUALIFIED" : finalScore >= 61 ? "HOT" : finalScore >= 31 ? "WARM" : "LOW");

    return { score: finalScore, level, factors };
  }

  levelRank(config: WhatsAppAiAgentConfig, level: string) {
    const levels = config.scoring?.levels || [];
    const index = levels.findIndex(
      (item) => String(item.level).toUpperCase() === String(level).toUpperCase(),
    );
    return index < 0 ? 0 : index;
  }

  meetsLevel(config: WhatsAppAiAgentConfig, current: string, target: string) {
    return this.levelRank(config, current) >= this.levelRank(config, target);
  }

  canConvert(params: {
    config: WhatsAppAiAgentConfig;
    lead: any;
    score: ScoreResult;
  }) {
    const { config, lead, score } = params;
    if (!this.meetsLevel(config, score.level, config.scoring.convertFromLevel || "QUALIFIED")) {
      return { ok: false, reason: "score_below_conversion_level" };
    }

    const required = (config.qualificationFields || []).filter((field) => field.required);
    const missing = required.filter(
      (field) => !hasValue(customValue(lead, field.key) ?? lead?.[field.key]),
    );
    if (missing.length) {
      return {
        ok: false,
        reason: "missing_required_fields",
        missing: missing.map((field) => field.key),
      };
    }

    if (config.scoring.requirePaymentConfirmation) {
      const paid =
        customValue(lead, "payment_confirmed") ||
        customValue(lead, "booking_confirmed") ||
        customValue(lead, "order_confirmed");
      if (!hasValue(paid)) {
        return { ok: false, reason: "payment_not_confirmed" };
      }
    }

    return { ok: true };
  }
}

export const aiAgentScoringService = new AiAgentScoringService();
