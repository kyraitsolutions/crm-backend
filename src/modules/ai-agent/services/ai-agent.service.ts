import { Types } from "mongoose";
import { HttpError } from "../../../utils/http.error.js";
import logger from "../../../utils/logger.js";
import {
  AI_AGENT_STATUS,
  AI_AGENT_VERSION_STATUS,
} from "../constants/ai-agent.constant.js";
import {
  AI_AGENT_SKILL_CATALOG,
  CUSTOM_SKILL_SUGGESTIONS,
} from "../constants/skill-catalog.constant.js";
import { UpdateAiAgentDraftDto } from "../dtos/ai-agent.dto.js";
import { DraftSkillDto } from "../dtos/draft-skill.dto.js";
import type { AiAgent } from "../models/ai-agent.model.js";
import { aiAgentRepository } from "../repositories/ai-agent.repository.js";
import { runtimeLlm } from "../runtime/utils/llm.util.js";
import type { TAiAgentConfig } from "../types/ai-agent.type.js";
import {
  DEFAULT_SKILL_TYPES,
  catalogItemToSkill,
  findSkillCatalogItem,
} from "../constants/skill-catalog.constant.js";
import { createDefaultAgentConfig } from "../utils/default-agent-config.util.js";
import {
  allowedSkillIcons,
  heuristicSkillDraft,
  sanitizeSkillDraft,
} from "../utils/skill-draft.util.js";

const asVersionId = (value: unknown) => new Types.ObjectId(String(value));

const serialize = (
  doc: { toJSON?: () => unknown; id?: unknown; _id?: unknown } | null,
): Record<string, unknown> | null => {
  if (!doc) return null;
  const json = (
    typeof doc.toJSON === "function" ? doc.toJSON() : doc
  ) as Record<string, unknown>;
  return {
    ...json,
    id: String(json.id || json._id),
  };
};

export class AiAgentService {
  async get(organizationId: string, accountId: string) {
    const agent = await this.findOwnedAgent(organizationId, accountId);
    if (!agent) return { agent: null, draft: null, live: null };
    return this.withVersions(agent);
  }

  async create(
    organizationId: string,
    accountId: string,
    input: {
      name: string;
      industry: string;
      website: string;
      timezone: string;
      greeting: string;
      description: string;
      skillTypes: string[];
      groundRules: string[];
    },
  ) {
    const existing = await this.findOwnedAgent(organizationId, accountId);
    if (existing) return this.withVersions(existing);

    const chosenTypes = input.skillTypes.length
      ? input.skillTypes
      : [...DEFAULT_SKILL_TYPES];
    const skills = chosenTypes
      .map((type) => findSkillCatalogItem(type))
      .filter((item) => item != null)
      .map((item) => catalogItemToSkill(item));

    const config = createDefaultAgentConfig({
      identity: {
        name: input.name,
        industry: input.industry,
        website: input.website,
        timezone: input.timezone || "Asia/Kolkata",
        greeting: input.greeting,
        description: input.description,
      },
      skills,
      groundRules: input.groundRules,
    });

    try {
      const agent = await aiAgentRepository.createAgent({
        organizationId,
        accountId,
        name: input.name,
      });
      const draft = await aiAgentRepository.createVersion({
        organizationId,
        accountId,
        agentId: String(agent._id),
        version: 1,
        status: AI_AGENT_VERSION_STATUS.DRAFT,
        config,
      });
      agent.draftVersionId = asVersionId(draft._id);
      await aiAgentRepository.saveAgent(agent);
      return this.withVersions(agent);
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
      const raced = await this.findOwnedAgent(organizationId, accountId);
      if (!raced) throw error;
      return this.withVersions(raced);
    }
  }

  async updateDraft(
    organizationId: string,
    accountId: string,
    dto: UpdateAiAgentDraftDto,
  ) {
    const { agent, draft } = await this.requireDraft(organizationId, accountId);

    if (dto.name) {
      agent.name = dto.name;
      if (dto.config.identity) dto.config.identity.name = dto.name;
    }

    draft.config = this.mergeConfig(draft.config, dto.config);
    if (dto.config.identity?.name) agent.name = dto.config.identity.name;

    await Promise.all([
      aiAgentRepository.saveAgent(agent),
      aiAgentRepository.saveVersion(draft),
    ]);

    return this.withVersions(agent);
  }

  async publish(organizationId: string, accountId: string) {
    const { agent, draft } = await this.requireDraft(organizationId, accountId);
    this.assertPublishReady(draft.config);

    const latest = await aiAgentRepository.latestVersionNumber(String(agent._id));
    const nextVersion = (latest?.version || draft.version) + 1;

    draft.status = AI_AGENT_VERSION_STATUS.PUBLISHED;
    draft.publishedAt = new Date();
    await aiAgentRepository.saveVersion(draft);

    const newDraft = await aiAgentRepository.createVersion({
      organizationId,
      accountId,
      agentId: String(agent._id),
      version: nextVersion,
      status: AI_AGENT_VERSION_STATUS.DRAFT,
      config: structuredClone(draft.config),
    });

    agent.status = AI_AGENT_STATUS.LIVE;
    agent.activeVersionId = asVersionId(draft._id);
    agent.draftVersionId = asVersionId(newDraft._id);
    await aiAgentRepository.saveAgent(agent);

    return this.withVersions(agent);
  }

  async rollback(
    organizationId: string,
    accountId: string,
    versionId: string,
  ) {
    const { agent } = await this.requireDraft(organizationId, accountId);
    const target = await aiAgentRepository.findVersionById(versionId);
    if (!target || String(target.agentId) !== String(agent._id)) {
      throw HttpError.notFound("Agent version not found");
    }
    if (target.status !== AI_AGENT_VERSION_STATUS.PUBLISHED) {
      throw HttpError.badRequest("Only a published version can be restored");
    }

    const draft = await this.ensureDraft(agent, structuredClone(target.config));
    agent.status = AI_AGENT_STATUS.LIVE;
    agent.activeVersionId = asVersionId(target._id);
    agent.draftVersionId = asVersionId(draft._id);
    await aiAgentRepository.saveAgent(agent);

    return this.withVersions(agent);
  }

  async listVersions(organizationId: string, accountId: string) {
    const agent = await this.findOwnedAgent(organizationId, accountId);
    if (!agent) return { agent: null, versions: [] };
    const versions = await aiAgentRepository.listVersions(String(agent._id));
    return {
      agent: serialize(agent),
      versions: versions.map((item) => serialize(item)),
    };
  }

  async getVersion(
    organizationId: string,
    accountId: string,
    versionId: string,
  ) {
    const { agent } = await this.requireDraft(organizationId, accountId);
    const version = await aiAgentRepository.findVersionById(versionId);
    if (!version || String(version.agentId) !== String(agent._id)) {
      throw HttpError.notFound("Agent version not found");
    }
    return {
      agent: serialize(agent),
      version: serialize(version),
    };
  }

  getSkillCatalog() {
    return {
      catalog: AI_AGENT_SKILL_CATALOG,
      suggestions: CUSTOM_SKILL_SUGGESTIONS,
      icons: allowedSkillIcons(),
    };
  }

  async draftSkill(
    organizationId: string,
    accountId: string,
    dto: DraftSkillDto,
  ) {
    const { draft } = await this.requireDraft(organizationId, accountId);
    const config = draft.config as TAiAgentConfig;
    const identity = config.identity || { name: "", description: "", industry: "" };
    const fallback = heuristicSkillDraft(dto.description, dto.suggestion);

    if (!runtimeLlm.isAvailable()) return fallback;

    try {
      const json = await runtimeLlm.completeJson({
        system: [
          "You draft WhatsApp AI agent skills as compact JSON with keys: name, whenToUse, instructions, icon.",
          `icon must be one of: ${allowedSkillIcons().join(", ")}.`,
          "name: short, 2-5 words.",
          "whenToUse: one paragraph describing the customer messages that should activate this skill. Be specific and distinct from other jobs.",
          "instructions: ordered steps. Ask one question at a time. Do not invent prices, policies, or availability.",
          identity.name ? `Business name: ${identity.name}` : "",
          identity.description ? `Business: ${identity.description}` : "",
          identity.industry ? `Industry: ${identity.industry}` : "",
        ]
          .filter(Boolean)
          .join(" "),
        user: [
          dto.suggestion ? `Suggestion: ${dto.suggestion}` : "",
          dto.description ? `Job: ${dto.description}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        maxTokens: 700,
      });
      if (!json) return fallback;
      return sanitizeSkillDraft(json, dto.description || dto.suggestion || fallback.name);
    } catch (error) {
      logger.warn("AI_AGENT_SKILL_DRAFT_FALLBACK", {
        message: error instanceof Error ? error.message : String(error),
      });
      return fallback;
    }
  }

  async loadRuntimeVersion(
    organizationId: string,
    accountId: string,
    useDraft = false,
  ) {
    const agent = await this.findOwnedAgent(organizationId, accountId);
    if (!agent) throw HttpError.notFound("AI agent not found");

    const usingDraft = Boolean(useDraft) || !agent.activeVersionId;
    const version = usingDraft
      ? await this.ensureDraft(agent, createDefaultAgentConfig())
      : await aiAgentRepository.findVersionById(String(agent.activeVersionId));

    if (!version) throw HttpError.notFound("AI agent version not found");
    return {
      agent,
      version,
      config: version.config as TAiAgentConfig,
      usingDraft,
    };
  }

  private async findOwnedAgent(organizationId: string, accountId: string) {
    const agent = await aiAgentRepository.findByAccountId(accountId);
    if (!agent || String(agent.organizationId) !== organizationId) return null;
    return agent;
  }

  private async requireDraft(organizationId: string, accountId: string) {
    const agent = await this.findOwnedAgent(organizationId, accountId);
    if (!agent) throw HttpError.notFound("Create an AI agent before editing it");
    const draft = await this.ensureDraft(agent, createDefaultAgentConfig());
    return { agent, draft };
  }

  private async ensureDraft(agent: AiAgent, config: TAiAgentConfig) {
    if (agent.draftVersionId) {
      const existing = await aiAgentRepository.findVersionById(
        String(agent.draftVersionId),
      );
      if (existing && existing.status === AI_AGENT_VERSION_STATUS.DRAFT) {
        return existing;
      }
    }

    const currentDraft = await aiAgentRepository.findDraftVersion(String(agent._id));
    if (currentDraft) {
      agent.draftVersionId = asVersionId(currentDraft._id);
      await aiAgentRepository.saveAgent(agent);
      return currentDraft;
    }

    const latest = await aiAgentRepository.latestVersionNumber(String(agent._id));
    const created = await aiAgentRepository.createVersion({
      organizationId: String(agent.organizationId),
      accountId: String(agent.accountId),
      agentId: String(agent._id),
      version: (latest?.version || 0) + 1,
      status: AI_AGENT_VERSION_STATUS.DRAFT,
      config,
    });
    agent.draftVersionId = asVersionId(created._id);
    await aiAgentRepository.saveAgent(agent);
    return created;
  }

  private async withVersions(agent: AiAgent) {
    const [draft, live] = await Promise.all([
      agent.draftVersionId
        ? aiAgentRepository.findVersionById(String(agent.draftVersionId))
        : aiAgentRepository.findDraftVersion(String(agent._id)),
      agent.activeVersionId
        ? aiAgentRepository.findVersionById(String(agent.activeVersionId))
        : Promise.resolve(null),
    ]);

    return {
      agent: serialize(agent),
      draft: serialize(draft),
      live: serialize(live),
    };
  }

  private mergeConfig(
    current: TAiAgentConfig,
    incoming: Partial<TAiAgentConfig>,
  ): TAiAgentConfig {
    return {
      identity: incoming.identity
        ? { ...current.identity, ...incoming.identity }
        : current.identity,
      groundRules: incoming.groundRules ?? current.groundRules,
      voice: incoming.voice ? { ...current.voice, ...incoming.voice } : current.voice,
      skills: incoming.skills ?? current.skills,
      tools: incoming.tools ?? current.tools,
      knowledgeSourceIds:
        incoming.knowledgeSourceIds ?? current.knowledgeSourceIds,
      safety: incoming.safety ? { ...current.safety, ...incoming.safety } : current.safety,
      legacyWhatsApp: current.legacyWhatsApp,
    };
  }

  private assertPublishReady(config: TAiAgentConfig) {
    if (!config.identity?.name?.trim() && !config.identity?.description?.trim()) {
      throw HttpError.badRequest(
        "Add a business name or description before publishing",
      );
    }
    if (!config.groundRules?.length) {
      throw HttpError.badRequest("Add at least one ground rule before publishing");
    }
  }
}

export const aiAgentService = new AiAgentService();
