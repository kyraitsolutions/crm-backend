import { Types } from "mongoose";
import { ContactModel } from "../../../../models/contact.model.js";
import { LeadModel } from "../../../../models/lead.model.js";
import { phoneMatchValues } from "../../../../utils/phone.util.js";
import {
  AI_AGENT_TOOL_KEY,
  AI_AGENT_TOOL_SENSITIVITY,
  AI_AGENT_TOOL_TYPE,
} from "../../constants/ai-agent.constant.js";
import { aiKnowledgeRetrieverService } from "../../services/ai-knowledge-retriever.service.js";
import type { TAiToolContext, TAiToolResult } from "../types/tool.type.js";
import { aiToolRegistry } from "./tool-registry.service.js";
import { callCustomApi } from "./custom-api.service.js";

const CONTACT_FIELDS = new Set(["name", "email", "phone"]);
const LEAD_RESERVED = new Set([
  "name",
  "email",
  "phone",
  "mobile",
  "company",
  "message",
  "description",
]);

const asObjectId = (value: string) => new Types.ObjectId(value);

const scalar = (value: unknown) => {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  return "";
};

export class AiToolExecutorService {
  async execute(
    key: string,
    rawArgs: Record<string, unknown>,
    context: TAiToolContext,
  ): Promise<TAiToolResult> {
    const definition =
      aiToolRegistry.get(key) ||
      aiToolRegistry.forAgent(context.agentConfig).find((tool) => tool.key === key);
    if (!definition) {
      return { key, ok: false, dryRun: context.dryRun, data: {}, error: "Unknown tool" };
    }

    const parsed = definition.argsSchema.safeParse(rawArgs || {});
    if (!parsed.success) {
      return {
        key,
        ok: false,
        dryRun: context.dryRun,
        data: {},
        error: parsed.error.issues.map((issue) => issue.message).join("; "),
      };
    }

    const args = parsed.data as Record<string, unknown>;
    if (
      context.dryRun &&
      definition.sensitivity !== AI_AGENT_TOOL_SENSITIVITY.READ_ONLY
    ) {
      return {
        key,
        ok: true,
        dryRun: true,
        data: { skipped: true, reason: "dry_run", args },
      };
    }

    try {
      if (key === AI_AGENT_TOOL_KEY.SEARCH_KNOWLEDGE) {
        return this.searchKnowledge(args, context);
      }
      if (key === AI_AGENT_TOOL_KEY.UPDATE_CONTACT) {
        return this.updateContact(args, context);
      }
      if (key === AI_AGENT_TOOL_KEY.CREATE_LEAD) {
        return this.createLead(args, context);
      }
      if (key === AI_AGENT_TOOL_KEY.UPDATE_LEAD) {
        return this.updateLead(args, context);
      }
      if (key === AI_AGENT_TOOL_KEY.ESCALATE_TO_HUMAN) {
        return this.escalate(args, context);
      }

      const configured = (context.agentConfig.tools || []).find((tool) => tool.key === key);
      
      if (configured?.type === AI_AGENT_TOOL_TYPE.CUSTOM_API) {
        return this.customApi(configured.config || {}, args, key, context);
      }
      return { key, ok: false, dryRun: context.dryRun, data: {}, error: "Unsupported tool" };
    } catch (error) {
      return {
        key,
        ok: false,
        dryRun: context.dryRun,
        data: {},
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async searchKnowledge(
    args: Record<string, unknown>,
    context: TAiToolContext,
  ): Promise<TAiToolResult> {
    const chunks = await aiKnowledgeRetrieverService.retrieve({
      organizationId: context.organizationId,
      accountId: context.accountId,
      query: String(args.query || context.userMessage),
      topK: Number(args.topK) || 4,
    });
    return {
      key: AI_AGENT_TOOL_KEY.SEARCH_KNOWLEDGE,
      ok: true,
      dryRun: context.dryRun,
      data: { count: chunks.length },
      retrievedChunks: chunks,
    };
  }

  private async updateContact(
    args: Record<string, unknown>,
    context: TAiToolContext,
  ): Promise<TAiToolResult> {
    const contactId = String(args.contactId || context.contactId || "");
    if (!contactId) {
      return {
        key: AI_AGENT_TOOL_KEY.UPDATE_CONTACT,
        ok: false,
        dryRun: false,
        data: {},
        error: "contactId is required",
      };
    }
    const fields = (args.fields || {}) as Record<string, unknown>;
    const $set: Record<string, string> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (!CONTACT_FIELDS.has(key)) continue;
      const next = scalar(value);
      if (next) $set[key] = next;
    }
    if (!Object.keys($set).length) {
      return {
        key: AI_AGENT_TOOL_KEY.UPDATE_CONTACT,
        ok: true,
        dryRun: false,
        data: { skipped: true, reason: "no_fields" },
        contactId,
      };
    }
    const updated = await ContactModel.findOneAndUpdate(
      { _id: asObjectId(contactId), accountId: context.accountId },
      { $set },
      { new: true },
    ).lean();
    if (!updated) {
      return {
        key: AI_AGENT_TOOL_KEY.UPDATE_CONTACT,
        ok: false,
        dryRun: false,
        data: {},
        error: "Contact not found",
      };
    }
    return {
      key: AI_AGENT_TOOL_KEY.UPDATE_CONTACT,
      ok: true,
      dryRun: false,
      data: { id: String(updated._id), fields: Object.keys($set) },
      contactId: String(updated._id),
    };
  }

  private async createLead(
    args: Record<string, unknown>,
    context: TAiToolContext,
  ): Promise<TAiToolResult> {
    const phone = String(args.phone || context.phone || "").trim();
    const email = String(args.email || "").trim();
    const name = String(args.name || context.contactName || phone || email || "Unknown").trim();
    const phones = phoneMatchValues(phone);
    if (phones.length || email) {
      const existing = await LeadModel.findOne({
        accountId: context.accountId,
        isDeleted: { $ne: true },
        $or: [
          ...(phones.length ? [{ phone: { $in: phones } }, { mobile: { $in: phones } }] : []),
          ...(email ? [{ email }] : []),
        ],
      })
        .sort({ updatedAt: -1 })
        .lean();
      if (existing) {
        return {
          key: AI_AGENT_TOOL_KEY.CREATE_LEAD,
          ok: true,
          dryRun: false,
          data: { id: String(existing._id), created: false },
          leadId: String(existing._id),
        };
      }
    }

    const created = await LeadModel.create({
      accountId: context.accountId,
      name,
      email,
      phone,
      mobile: phone,
      company: String(args.company || ""),
      message: String(args.message || context.userMessage || "").slice(0, 2000),
      source: { name: "manual" },
      stage: "new",
      status: "active",
    });
    return {
      key: AI_AGENT_TOOL_KEY.CREATE_LEAD,
      ok: true,
      dryRun: false,
      data: { id: String(created._id), created: true },
      leadId: String(created._id),
    };
  }

  private async updateLead(
    args: Record<string, unknown>,
    context: TAiToolContext,
  ): Promise<TAiToolResult> {
    const leadId = String(args.leadId || context.leadId || "");
    if (!leadId) {
      return {
        key: AI_AGENT_TOOL_KEY.UPDATE_LEAD,
        ok: false,
        dryRun: false,
        data: {},
        error: "leadId is required",
      };
    }
    const fields = (args.fields || {}) as Record<string, unknown>;
    const $set: Record<string, unknown> = {};
    for (const [rawKey, rawValue] of Object.entries(fields)) {
      const key = String(rawKey || "").trim();
      if (!key || key.includes(".")) continue;
      const value = scalar(rawValue);
      if (!value) continue;
      if (LEAD_RESERVED.has(key)) $set[key] = value;
      else $set[`customFields.${key}`] = value;
    }
    if (args.stage) $set.stage = String(args.stage);
    if (!Object.keys($set).length) {
      return {
        key: AI_AGENT_TOOL_KEY.UPDATE_LEAD,
        ok: true,
        dryRun: false,
        data: { skipped: true, reason: "no_fields" },
        leadId,
      };
    }
    const updated = await LeadModel.findOneAndUpdate(
      { _id: asObjectId(leadId), accountId: context.accountId, isDeleted: { $ne: true } },
      { $set },
      { new: true },
    ).lean();
    if (!updated) {
      return {
        key: AI_AGENT_TOOL_KEY.UPDATE_LEAD,
        ok: false,
        dryRun: false,
        data: {},
        error: "Lead not found",
      };
    }
    return {
      key: AI_AGENT_TOOL_KEY.UPDATE_LEAD,
      ok: true,
      dryRun: false,
      data: { id: String(updated._id), fields: Object.keys($set) },
      leadId: String(updated._id),
    };
  }

  private escalate(
    args: Record<string, unknown>,
    context: TAiToolContext,
  ): TAiToolResult {
    return {
      key: AI_AGENT_TOOL_KEY.ESCALATE_TO_HUMAN,
      ok: true,
      dryRun: context.dryRun,
      data: {
        reason: String(args.reason || "Customer requested a human"),
        summary: String(args.summary || ""),
        urgency: String(args.urgency || "medium"),
        note: "Test runtime does not pause WhatsApp live chat",
      },
      shouldHandoff: true,
    };
  }

  private async customApi(
    config: Record<string, unknown>,
    args: Record<string, unknown>,
    key: string,
    context: TAiToolContext,
  ): Promise<TAiToolResult> {
    try {
      const result = await callCustomApi(
        {
          method: String(config.method || "GET"),
          endpoint: String(config.endpoint || ""),
          headers: (config.headers || {}) as Record<string, string>,
          params: {
            ...((config.params as Record<string, string>) || {}),
            ...(args.query &&
            typeof args.query === "object" &&
            !Array.isArray(args.query)
              ? (args.query as Record<string, string>)
              : {}),
          },
          authType: String(config.authType || ""),
          authToken: String(config.authToken || ""),
          timeoutMs: Number(config.timeoutMs) || 10000,
        },
        {
          query: String(args.query || context.userMessage || ""),
          id: String(args.id || ""),
          phone: context.phone || "",
          name: context.contactName || "",
        },
      );
      return {
        key,
        ok: result.ok,
        dryRun: false,
        data: { status: result.status, body: result.body, record: result.record },
        error: result.error || undefined,
      };
    } catch (error) {
      return {
        key,
        ok: false,
        dryRun: false,
        data: {},
        error: error instanceof Error ? error.message : "Custom API call failed",
      };
    }
  }
}

export const aiToolExecutorService = new AiToolExecutorService();
