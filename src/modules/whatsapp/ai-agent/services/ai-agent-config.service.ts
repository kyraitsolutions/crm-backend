import {
  DEFAULT_AGENT_INSTRUCTIONS,
  DEFAULT_INTENTS,
  DEFAULT_SCORE_LEVELS,
  DEFAULT_SCORE_WEIGHTS,
} from "../constants/ai-agent.constant.js";
import { WhatsAppAiAgentConfigModel } from "../models/whatsapp-ai-agent-config.model.js";

const serialize = (doc: any) => {
  if (!doc) return doc;
  const json = typeof doc.toJSON === "function" ? doc.toJSON() : doc;
  return {
    ...json,
    id: String(json.id || json._id),
  };
};

export class AiAgentConfigService {
  private cache = new Map<string, { at: number; value: any }>();

  async getOrCreate(organizationId: string, accountId: string) {
    const cached = this.cache.get(accountId);
    if (cached && Date.now() - cached.at < 30_000) return cached.value;

    const existing = await WhatsAppAiAgentConfigModel.findOne({ accountId });
    if (existing) {
      const value = serialize(existing);
      this.cache.set(accountId, { at: Date.now(), value });
      return value;
    }

    const created = await WhatsAppAiAgentConfigModel.create({
      organizationId,
      accountId,
      enabled: true,
      instructions: DEFAULT_AGENT_INSTRUCTIONS,
      intents: DEFAULT_INTENTS,
      scoring: {
        weights: DEFAULT_SCORE_WEIGHTS,
        levels: DEFAULT_SCORE_LEVELS,
        notifyFromLevel: "HOT",
        convertFromLevel: "QUALIFIED",
        convertedStage: "converted",
        requirePaymentConfirmation: false,
      },
    }).catch(async (error: any) => {
      if (error?.code !== 11000) throw error;
      return WhatsAppAiAgentConfigModel.findOne({ accountId });
    });
    const value = serialize(created);
    this.cache.set(accountId, { at: Date.now(), value });
    return value;
  }

  async update(
    organizationId: string,
    accountId: string,
    payload: Record<string, unknown>,
  ) {
    this.cache.delete(accountId);
    const current = await this.getOrCreate(organizationId, accountId);
    const next = {
      enabled: payload.enabled ?? current.enabled,
      instructions:
        payload.instructions !== undefined
          ? String(payload.instructions)
          : current.instructions,
      businessProfile: {
        ...current.businessProfile,
        ...((payload.businessProfile as object) || {}),
      },
      qualificationFields:
        payload.qualificationFields !== undefined
          ? payload.qualificationFields
          : current.qualificationFields,
      intents: payload.intents !== undefined ? payload.intents : current.intents,
      scoring: {
        ...current.scoring,
        ...((payload.scoring as object) || {}),
        weights: {
          ...current.scoring?.weights,
          ...(((payload.scoring as any)?.weights as object) || {}),
        },
      },
      discount: {
        ...current.discount,
        ...((payload.discount as object) || {}),
      },
      escalation: {
        ...current.escalation,
        ...((payload.escalation as object) || {}),
      },
    };

    const updated = await WhatsAppAiAgentConfigModel.findOneAndUpdate(
      { accountId },
      { $set: { organizationId, ...next } },
      { new: true, upsert: true },
    );
    const value = serialize(updated);
    this.cache.set(accountId, { at: Date.now(), value });
    return value;
  }
}

export const aiAgentConfigService = new AiAgentConfigService();
