import { Types } from "mongoose";
import { AiAgentModel, type AiAgent } from "../models/ai-agent.model.js";
import {
  AiAgentVersionModel,
  type AiAgentVersion,
} from "../models/ai-agent-version.model.js";
import type { TAiAgentConfig } from "../types/ai-agent.type.js";

const asObjectId = (value: string | Types.ObjectId) =>
  value instanceof Types.ObjectId ? value : new Types.ObjectId(value);

export class AiAgentRepository {
  findByAccountId(accountId: string) {
    return AiAgentModel.findOne({ accountId: asObjectId(accountId) });
  }

  createAgent(payload: {
    organizationId: string;
    accountId: string;
    name: string;
  }) {
    return AiAgentModel.create({
      organizationId: asObjectId(payload.organizationId),
      accountId: asObjectId(payload.accountId),
      name: payload.name,
    });
  }

  saveAgent(agent: AiAgent) {
    return agent.save();
  }

  findVersionById(versionId: string) {
    return AiAgentVersionModel.findById(versionId);
  }

  findDraftVersion(agentId: string) {
    return AiAgentVersionModel.findOne({
      agentId: asObjectId(agentId),
      status: "draft",
    }).sort({ version: -1 });
  }

  listVersions(agentId: string) {
    return AiAgentVersionModel.find({ agentId: asObjectId(agentId) })
      .sort({ version: -1 })
      .select("-config");
  }

  latestVersionNumber(agentId: string) {
    return AiAgentVersionModel.findOne({ agentId: asObjectId(agentId) })
      .sort({ version: -1 })
      .select("version");
  }

  createVersion(payload: {
    organizationId: string;
    accountId: string;
    agentId: string;
    version: number;
    status: "draft" | "published" | "archived";
    config: TAiAgentConfig;
    publishedAt?: Date | null;
  }) {
    return AiAgentVersionModel.create({
      organizationId: asObjectId(payload.organizationId),
      accountId: asObjectId(payload.accountId),
      agentId: asObjectId(payload.agentId),
      version: payload.version,
      status: payload.status,
      config: payload.config,
      publishedAt: payload.publishedAt ?? null,
    });
  }

  saveVersion(version: AiAgentVersion) {
    return version.save();
  }
}

export const aiAgentRepository = new AiAgentRepository();
