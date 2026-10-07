import { Types } from "mongoose";
import { ContactModel } from "../../../../models/contact.model.js";
import { ConversationModel } from "../../../../models/conversations.model.js";
import logger from "../../../../utils/logger.js";
import { buildTemplateComponents } from "../../broadcast/utils/broadcast.util.js";
import { WhatsappMessageService } from "../../messages/services/message.service.js";
import { WhatsappTemplateModel } from "../../templates/models/template.model.js";
import type { ChatFlowRuntimeNode } from "../types/chatflow-runtime.type.js";
import { nodeKind } from "../utils/chatflow-graph.util.js";
import {
  evaluateRules,
  fillTemplate,
  interpolateMessage,
  matchesKeyword,
  safeRequestUrl,
  type FlowVariables,
} from "../utils/chatflow-logic.util.js";

type ExecuteNodeParams = {
  accountId: string;
  phone: string;
  node: ChatFlowRuntimeNode;
  conversationId?: string;
  variables: FlowVariables;
};

export type NodeExecutionResult = {
  stop?: boolean;
  jumpTo?: string;
  branch?: string;
};

export class ChatFlowNodeExecutor {
  private whatsappMessageService = new WhatsappMessageService();

  async execute(params: ExecuteNodeParams): Promise<NodeExecutionResult | void> {
    const kind = nodeKind(params.node);
    switch (kind) {
      case "send_message":
        await this.sendMessageNode(params);
        return;
      case "button":
      case "list":
      case "carousel":
        await this.sendInteractiveNode(params);
        return;
      case "question":
        await this.sendQuestionNode(params);
        return;
      case "template":
        await this.sendTemplateNode(params);
        return;
      case "chat":
        await this.sendChatNode(params);
        return;
      case "keyword":
        return this.keywordNode(params);
      case "condition":
        return this.conditionNode(params);
      case "set_attribute":
        return this.attributeNode(params);
      case "add_tag":
      case "remove_tag":
        return this.tagNode(params, kind === "remove_tag");
      case "delay":
        return this.delayNode(params);
      case "goto":
        return this.gotoNode(params);
      case "end":
        return { stop: true };
      case "api_request":
        return this.apiNode(params);
      case "handoff":
        return this.handoffNode(params);
      case "ask_address":
      case "ask_media":
        await this.sendText(
          params.accountId,
          params.phone,
          fillTemplate(String(params.node.data?.payload?.ask?.text || ""), params.variables),
        );
        return;
      case "ask_location":
        await this.askLocation(params);
        return;
      default:
        logger.warn("WHATSAPP_CHATFLOW_NODE_SKIPPED", {
          reason: "unsupported_node",
          nodeId: params.node.id,
          kind,
        });
    }
  }

  private async sendMessageNode({ accountId, phone, node, variables }: ExecuteNodeParams) {
    const items = Array.isArray(node.data?.payload) ? node.data.payload : [];
    for (const item of items) {
      const type = String(item?.type || "").trim();
      switch (type) {
        case "text": {
          const body = this.outgoingText(node.id, item.content, variables);
          if (!body) break;
          await this.sendText(accountId, phone, body);
          break;
        }
        case "image":
        case "video":
        case "document": {
          const media = item[type] || {};
          const link = String(media.link || "").trim();
          if (!link) break;
          const caption = media.caption
            ? this.outgoingText(node.id, media.caption, variables)
            : undefined;
          await this.whatsappMessageService.send(accountId, {
            type,
            to: phone,
            source: "automation",
            from: "bot",
            caption,
            [type]: {
              link,
              caption,
              filename: this.fileNameFromLink(link),
            },
          });
          break;
        }
        default:
          break;
      }
    }
  }

  private outgoingText(nodeId: string, template: unknown, variables: FlowVariables) {
    const rendered = interpolateMessage(String(template || ""), variables);
    if (rendered.missing.length) {
      logger.warn("WHATSAPP_CHATFLOW_VARIABLE_MISSING", {
        nodeId,
        keys: rendered.missing,
      });
    }
    return rendered.text.trim();
  }

  private async sendInteractiveNode({
    accountId,
    phone,
    node,
  }: ExecuteNodeParams) {
    const interactive = this.sanitizeInteractive(node.data?.payload?.interactive);
    if (!interactive) {
      logger.warn("WHATSAPP_CHATFLOW_NODE_SKIPPED", {
        reason: "interactive_payload_missing",
        nodeId: node.id,
      });
      return;
    }
    await this.whatsappMessageService.send(accountId, {
      type: "interactive",
      to: phone,
      source: "automation",
      from: "bot",
      interactive,
    });
  }

  private async sendTemplateNode({ accountId, phone, node }: ExecuteNodeParams) {
    const saved = node.data?.payload?.template;
    const templateId = String(saved?.id || "").trim();
    const templateName = String(saved?.name || "").trim();
    if (!templateId && !templateName) {
      logger.warn("WHATSAPP_CHATFLOW_NODE_SKIPPED", {
        reason: "template_not_selected",
        nodeId: node.id,
      });
      return;
    }

    const filter: Record<string, unknown> = {
      accountId,
      status: "APPROVED",
    };
    if (templateId && Types.ObjectId.isValid(templateId)) {
      filter._id = templateId;
    } else {
      filter.name = templateName.toLowerCase();
    }

    const template = await WhatsappTemplateModel.findOne(filter);
    if (!template) {
      logger.warn("WHATSAPP_CHATFLOW_NODE_SKIPPED", {
        reason: "approved_template_not_found",
        nodeId: node.id,
        templateId,
        templateName,
      });
      return;
    }

    const components = this.templateComponents(template);
    await this.whatsappMessageService.send(accountId, {
      type: "template",
      to: phone,
      source: "automation",
      from: "bot",
      template: {
        name: template.name,
        language: { code: template.language || saved?.language || "en" },
        ...(components ? { components } : {}),
      },
    });
  }

  private templateComponents(template: { components?: unknown[] }) {
    const components = buildTemplateComponents(template, { name: "there" }) || [];
    for (const component of template.components || []) {
      const row = component as {
        type?: string;
        format?: string;
        media?: { link?: string };
      };
      if (String(row.type || "").toUpperCase() !== "HEADER") continue;
      const format = String(row.format || "").toLowerCase();
      if (format !== "image" && format !== "video" && format !== "document") continue;
      const link = String(row.media?.link || "").trim();
      if (!link) continue;
      const hasHeader = components.some(
        (item) => String(item.type || "").toLowerCase() === "header",
      );
      if (hasHeader) continue;
      components.unshift({
        type: "header",
        parameters: [
          {
            type: format,
            [format]: { link },
          },
        ],
      });
    }
    return components.length ? components : undefined;
  }

  async sendCustomerText(accountId: string, phone: string, text: string) {
    const body = String(text || "").trim().slice(0, 1024);
    if (!body) return;
    await this.sendText(accountId, phone, body);
  }

  private async sendQuestionNode(params: ExecuteNodeParams) {
    const question = params.node.data?.payload?.question || {};
    const text = fillTemplate(String(question.text || ""), params.variables).trim().slice(0, 1024);
    if (!text) return;
    const inputType = String(question.inputType || "text");
    if (inputType === "location") {
      await this.sendLocationRequest(params.accountId, params.phone, text);
      return;
    }
    if (inputType === "buttons") {
      const options = (Array.isArray(question.options) ? question.options : [])
        .map((option: string) => String(option || "").trim())
        .filter(Boolean)
        .slice(0, 3);
      if (options.length) {
        await this.whatsappMessageService.send(params.accountId, {
          type: "interactive",
          to: params.phone,
          source: "automation",
          from: "bot",
          interactive: {
            type: "button",
            body: { text },
            action: {
              buttons: options.map((title: string, index: number) => ({
                type: "reply",
                reply: {
                  id: `qopt_${index + 1}`,
                  title: title.slice(0, 20),
                },
              })),
            },
          },
        });
        return;
      }
    }
    await this.sendText(params.accountId, params.phone, text);
  }

  private async sendChatNode({ accountId, phone, node }: ExecuteNodeParams) {
    const elements = node.data?.elements || [];
    for (const element of elements) {
      if (element.type === "text") {
        const body = String(element.content || "").trim();
        if (body) await this.sendText(accountId, phone, body);
      }
    }

    const optionTitles = elements
      .filter((element) => element.type === "option")
      .flatMap((element) => {
        if (element.choices?.length) return element.choices;
        return element.title ? [element.title] : [];
      })
      .map((title) => String(title || "").trim())
      .filter(Boolean);

    if (!optionTitles.length) return;

    if (optionTitles.length <= 3) {
      await this.whatsappMessageService.send(accountId, {
        type: "interactive",
        to: phone,
        source: "automation",
        from: "bot",
        interactive: {
          type: "button",
          body: { text: "Please choose an option" },
          action: {
            buttons: optionTitles.slice(0, 3).map((title, index) => ({
              type: "reply",
              reply: {
                id: `chat_option_${index + 1}`,
                title: title.slice(0, 20),
              },
            })),
          },
        },
      });
      return;
    }

    await this.whatsappMessageService.send(accountId, {
      type: "interactive",
      to: phone,
      source: "automation",
      from: "bot",
      interactive: {
        type: "list",
        body: { text: "Please choose an option" },
        action: {
          button: "Options",
          sections: [
            {
              title: "Options",
              rows: optionTitles.slice(0, 10).map((title, index) => ({
                id: `chat_option_${index + 1}`,
                title: title.slice(0, 24),
              })),
            },
          ],
        },
      },
    });
  }

  private async sendText(accountId: string, phone: string, body: string) {
    await this.whatsappMessageService.send(accountId, {
      type: "text",
      to: phone,
      source: "automation",
      from: "bot",
      text: { body: body.slice(0, 4000) },
    });
  }

  private sanitizeInteractive(interactive: any) {
    if (!interactive || typeof interactive !== "object") return null;
    const next = { ...interactive };

    if (next.header) {
      const header = { ...next.header };
      const hasContent = Boolean(
        (header.type === "text" && String(header.text || "").trim()) ||
          header.image?.link ||
          header.image?.id ||
          header.video?.link ||
          header.video?.id ||
          header.document?.link ||
          header.document?.id,
      );
      if (hasContent) next.header = header;
      else delete next.header;
    }

    if (next.footer) {
      const text = String(next.footer.text || "").trim();
      if (text) next.footer = { text };
      else delete next.footer;
    }

    if (Array.isArray(next.action?.buttons)) {
      next.action = {
        ...next.action,
        buttons: next.action.buttons
          .map((button: any) => {
            if (button?.type === "quick_reply" && button.quick_reply) {
              return { type: "reply", reply: button.quick_reply };
            }
            return button;
          })
          .filter((button: any) => button?.reply?.id && button?.reply?.title),
      };
    }

    return next;
  }

  private fileNameFromLink(link: string) {
    try {
      const name = decodeURIComponent(link.split("/").pop() || "");
      return name || undefined;
    } catch {
      return undefined;
    }
  }

  private keywordNode({ node, variables }: ExecuteNodeParams): NodeExecutionResult {
    const matched = matchesKeyword(node.data?.payload?.keyword, String(variables.reply || ""));
    return { branch: matched ? "matched" : "unmatched" };
  }

  private conditionNode({ node, variables }: ExecuteNodeParams): NodeExecutionResult {
    const condition = node.data?.payload?.condition || {};
    const passed = evaluateRules(condition.rules || [], condition.match || "all", variables);
    return { branch: passed ? "true" : "false" };
  }

  private async attributeNode(params: ExecuteNodeParams): Promise<NodeExecutionResult> {
    const attribute = params.node.data?.payload?.attribute || {};
    const key = String(attribute.key || "")
      .trim()
      .replace(/[^a-zA-Z0-9_]/g, "");
    if (!key) return {};
    const raw = fillTemplate(String(attribute.value || ""), params.variables).trim();
    const dataType = attribute.dataType === "number" ? "number" : "text";
    if (!raw) {
      params.variables[`${key}_status`] = "missing";
      return {};
    }
    if (dataType === "number" && !Number.isFinite(Number(raw))) {
      params.variables[`${key}_status`] = "invalid";
      return {};
    }
    const value = dataType === "number" ? String(Number(raw)) : raw;
    const scope = ["contact", "conversation"].includes(String(attribute.scope))
      ? String(attribute.scope)
      : "flow";
    params.variables[key] = value;
    params.variables[`${key}_status`] = "saved";

    if (scope === "contact") {
      const saved = await this.writeContactAttribute(params, key, value);
      params.variables[`${key}_status`] = saved ? "saved" : "contact_missing";
    }
    if (scope === "conversation" && params.conversationId) {
      await ConversationModel.updateOne(
        { _id: params.conversationId },
        { $set: { [`metadata.chatflowAttributes.${key}`]: value } },
      );
    }
    return {};
  }

  private async writeContactAttribute(params: ExecuteNodeParams, key: string, value: string) {
    const digits = params.phone.replace(/\D/g, "");
    const contact = await ContactModel.findOne({
      accountId: params.accountId,
      phone: { $regex: `${digits.slice(-10)}$` },
    });
    if (!contact) {
      logger.info("WHATSAPP_CHATFLOW_ATTRIBUTE_SKIPPED", {
        reason: "contact_not_found",
        accountId: params.accountId,
        key,
      });
      return false;
    }
    if (key === "name") contact.name = value;
    else if (key === "email") contact.email = value.toLowerCase();
    else {
      const attributes = {
        ...((contact.attributes || {}) as Record<string, string>),
        [key]: value,
      };
      contact.attributes = attributes;
      contact.markModified("attributes");
    }
    await contact.save();
    return true;
  }

  private async tagNode(params: ExecuteNodeParams, remove: boolean) {
    const name = fillTemplate(String(params.node.data?.payload?.tag?.name || ""), params.variables)
      .trim()
      .toLowerCase();
    if (!name) return {};
    const digits = params.phone.replace(/\D/g, "");
    const contact = await ContactModel.findOne({
      accountId: params.accountId,
      phone: { $regex: `${digits.slice(-10)}$` },
    });
    if (!contact) {
      logger.info("WHATSAPP_CHATFLOW_TAG_SKIPPED", {
        reason: "contact_not_found",
        accountId: params.accountId,
      });
      return {};
    }
    const tags = new Set((contact.tags || []).map((tag) => String(tag)));
    if (remove) tags.delete(name);
    else tags.add(name);
    contact.tags = [...tags];
    await contact.save();
    return {};
  }

  private async delayNode(_params: ExecuteNodeParams) {
    return {};
  }

  private gotoNode({ node }: ExecuteNodeParams): NodeExecutionResult {
    const target = String(node.data?.payload?.goto?.targetNodeId || "").trim();
    return target ? { jumpTo: target } : { stop: true };
  }

  private async apiNode({ node, variables }: ExecuteNodeParams): Promise<NodeExecutionResult> {
    const request = node.data?.payload?.request || {};
    const saveAs = String(request.saveAs || "api").replace(/[^a-zA-Z0-9_]/g, "") || "api";
    const url = safeRequestUrl(this.requestUrl(request, variables));
    if (!url) {
      variables[`${saveAs}.status`] = "invalid_url";
      return { branch: "failure" };
    }

    const method = String(request.method || "GET").toUpperCase();
    const headers: Record<string, string> = {};
    for (const header of request.headers || []) {
      const key = String(header?.key || "").trim();
      if (!key) continue;
      headers[key] = fillTemplate(String(header?.value || ""), variables);
    }
    const bodyText = fillTemplate(String(request.body || ""), variables).trim();
    const timeoutMs = Math.min(15000, Math.max(1000, Number(request.timeoutMs || 8000)));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: method === "GET" || method === "DELETE" || !bodyText ? undefined : bodyText,
        signal: controller.signal,
        redirect: "manual",
      });
      if (response.status >= 300 && response.status < 400) {
        variables[`${saveAs}.status`] = "redirect_blocked";
        return { branch: "failure" };
      }
      const text = await response.text();
      variables[`${saveAs}.status`] = String(response.status);
      this.storeResponse(saveAs, text, variables);
      return { branch: response.ok ? "success" : "failure" };
    } catch (error) {
      variables[`${saveAs}.status`] = "error";
      logger.warn("WHATSAPP_CHATFLOW_API_FAILED", {
        nodeId: node.id,
        error: (error as Error).message,
      });
      return { branch: "failure" };
    } finally {
      clearTimeout(timer);
    }
  }

  private storeResponse(saveAs: string, text: string, variables: FlowVariables) {
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      variables[`${saveAs}.body`] = text.slice(0, 500);
      return;
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      variables[`${saveAs}.body`] = text.slice(0, 500);
      return;
    }
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        variables[`${saveAs}.${key}`] = String(value);
      }
    }
  }

  private requestUrl(
    request: { url?: string; query?: Array<{ key?: string; value?: string }> },
    variables: FlowVariables,
  ) {
    const raw = fillTemplate(String(request.url || ""), variables).trim();
    if (!raw) return "";
    try {
      const url = new URL(raw);
      for (const item of request.query || []) {
        const key = fillTemplate(String(item?.key || ""), variables).trim();
        if (!key) continue;
        url.searchParams.set(key, fillTemplate(String(item?.value || ""), variables));
      }
      return url.toString();
    } catch {
      return raw;
    }
  }

  private async askLocation({ accountId, phone, node, variables }: ExecuteNodeParams) {
    const text = fillTemplate(
      String(node.data?.payload?.ask?.text || "Please share your location."),
      variables,
    ).slice(0, 1024);
    await this.sendLocationRequest(accountId, phone, text);
  }

  private async sendLocationRequest(accountId: string, phone: string, text: string) {
    await this.whatsappMessageService.send(accountId, {
      type: "interactive",
      to: phone,
      source: "automation",
      from: "bot",
      interactive: {
        type: "location_request_message",
        body: { text },
        action: { name: "send_location" },
      },
    });
  }

  private async handoffNode({
    node,
    variables,
    conversationId,
    accountId,
    phone,
  }: ExecuteNodeParams) {
    const handoff = node.data?.payload?.handoff || {};
    const note = fillTemplate(String(handoff.note || ""), variables).slice(0, 500);
    const reason = fillTemplate(String(handoff.reason || ""), variables).slice(0, 200);
    const customerMessage = fillTemplate(String(handoff.customerMessage || ""), variables).slice(0, 1024);
    const priority = ["low", "high"].includes(String(handoff.priority))
      ? String(handoff.priority)
      : "normal";
    if (customerMessage) await this.sendText(accountId, phone, customerMessage);
    if (conversationId) {
      await ConversationModel.updateOne(
        { _id: conversationId },
        {
          $set: {
            "metadata.liveChat.humanIntervened": true,
            "metadata.liveChat.handoffNote": note,
            "metadata.liveChat.handoffReason": reason,
            "metadata.liveChat.priority": priority,
            "metadata.liveChat.escalationReason": "chatflow_handoff",
          },
        },
      );
    }
    return { stop: true };
  }
}

export const chatFlowNodeExecutor = new ChatFlowNodeExecutor();
