import {
  AI_AGENT_TOOL_KEY,
  AI_AGENT_TOOL_TYPE,
} from "../../constants/ai-agent.constant.js";
import { AI_AGENT_INTENT } from "../../runtime/constants/runtime.constant.js";
import type { TAiAgentToolConfig } from "../../types/ai-agent.type.js";
import {
  followUpField,
  isDetailApi,
  matchCustomApis,
  matchProductChoice,
  pickDetailApis,
  productIdFromButton,
  resolveCatalogItem,
  selectedProductFollowUp,
  type TProductCatalog,
} from "./custom-api.service.js";
import type { TAiToolCall, TAiToolDefinition } from "../types/tool.type.js";

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /(\+?\d[\d\s-]{8,}\d)/;

const extract = (message: string) => {
  const email = message.match(EMAIL_RE)?.[0] || "";
  const phone = (message.match(PHONE_RE)?.[1] || "").replace(/[^\d+]/g, "");
  return { email, phone };
};

export const planToolCalls = (params: {
  intent: string | null;
  userMessage: string;
  tools: TAiToolDefinition[];
  contactId?: string;
  leadId?: string;
  connectedToolKeys?: string[];
  agentTools?: TAiAgentToolConfig[];
  catalog?: TProductCatalog;
  selectionId?: string;
}): TAiToolCall[] => {
  const enabled = new Set(params.tools.map((tool) => tool.key));
  const calls: TAiToolCall[] = [];
  const extracted = extract(params.userMessage);
  const planned = new Set<string>();
  const pushCall = (call: TAiToolCall) => {
    if (!enabled.has(call.key) || planned.has(call.key)) return;
    planned.add(call.key);
    calls.push(call);
  };

  const selected = resolveCatalogItem(params.userMessage, params.catalog?.items || []);
  const choice = matchProductChoice(params.userMessage, params.catalog?.choices || []);
  const clickedId = productIdFromButton(String(params.selectionId || ""));
  const rememberedId = String(
    params.catalog?.selectedId || params.catalog?.selected?.id || "",
  );
  const aboutSelected = selectedProductFollowUp(
    params.userMessage,
    params.agentTools || [],
    rememberedId,
  );
  const detailId =
    clickedId ||
    selected?.id ||
    ((choice || followUpField(params.userMessage) || aboutSelected) && rememberedId
      ? rememberedId
      : "");
  if (detailId || followUpField(params.userMessage)) {
    const agentTools = params.agentTools || [];
    const details = pickDetailApis(agentTools, params.catalog?.sourceKey);
    const source = agentTools.filter(
      (tool) => tool.enabled && tool.key === params.catalog?.sourceKey,
    );
    const collection = agentTools.filter(
      (tool) =>
        tool.enabled &&
        tool.type === AI_AGENT_TOOL_TYPE.CUSTOM_API &&
        !isDetailApi(tool),
    );
    const targets = details.length ? details : source.length ? source : collection.slice(0, 1);
    if (detailId) {
      for (const tool of targets) {
        pushCall({
          key: tool.key,
          args: { id: detailId, query: params.userMessage },
        });
      }
    }
    if (calls.length || followUpField(params.userMessage)) return calls;
  }

  pushCall({
    key: AI_AGENT_TOOL_KEY.SEARCH_KNOWLEDGE,
    args: { query: params.userMessage, topK: 4 },
  });

  if (
    (params.intent === AI_AGENT_INTENT.QUALIFICATION ||
      params.intent === AI_AGENT_INTENT.BOOKING) &&
    !params.leadId
  ) {
    pushCall({
      key: AI_AGENT_TOOL_KEY.CREATE_LEAD,
      args: {
        name: "",
        email: extracted.email,
        phone: extracted.phone || "",
        message: params.userMessage,
      },
    });
  }

  if (params.leadId && (extracted.email || extracted.phone)) {
    pushCall({
      key: AI_AGENT_TOOL_KEY.UPDATE_LEAD,
      args: {
        leadId: params.leadId,
        fields: {
          ...(extracted.email ? { email: extracted.email } : {}),
          ...(extracted.phone ? { phone: extracted.phone } : {}),
        },
      },
    });
  }

  if (params.contactId && (extracted.email || extracted.phone)) {
    pushCall({
      key: AI_AGENT_TOOL_KEY.UPDATE_CONTACT,
      args: {
        contactId: params.contactId,
        fields: {
          ...(extracted.email ? { email: extracted.email } : {}),
          ...(extracted.phone ? { phone: extracted.phone } : {}),
        },
      },
    });
  }

  for (const tool of matchCustomApis(params.userMessage, params.agentTools || [])) {
    pushCall({
      key: tool.key,
      args: { query: params.userMessage, ...(detailId ? { id: detailId } : {}) },
    });
  }

  const connected = (params.connectedToolKeys || []).filter(Boolean);
  for (const key of connected) {
    const tool = params.tools.find((item) => item.key === key);
    if (!tool) continue;
    if (tool.type === AI_AGENT_TOOL_TYPE.CUSTOM_API) {
      pushCall({
        key,
        args: {
          body: { query: params.userMessage },
        },
      });
      continue;
    }
    if (key === AI_AGENT_TOOL_KEY.ESCALATE_TO_HUMAN) {
      pushCall({
        key,
        args: { reason: params.userMessage, summary: params.userMessage },
      });
    } else if (key === AI_AGENT_TOOL_KEY.CREATE_LEAD && !params.leadId) {
      pushCall({
        key,
        args: {
          name: "",
          email: extracted.email,
          phone: extracted.phone || "",
          message: params.userMessage,
        },
      });
    } else if (
      key === AI_AGENT_TOOL_KEY.UPDATE_CONTACT &&
      params.contactId
    ) {
      pushCall({
        key,
        args: {
          contactId: params.contactId,
          fields: {
            ...(extracted.email ? { email: extracted.email } : {}),
            ...(extracted.phone ? { phone: extracted.phone } : {}),
          },
        },
      });
    } else {
      pushCall({
        key,
        args: { query: params.userMessage },
      });
    }
  }

  return calls;
};
