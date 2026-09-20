import logger from "../../../../utils/logger.js";
import { WhatsappMessageService } from "../../messages/services/message.service.js";
import type { ChatFlowRuntimeNode } from "../types/chatflow-runtime.type.js";
import { nodeKind } from "../utils/chatflow-graph.util.js";

type ExecuteNodeParams = {
  accountId: string;
  phone: string;
  node: ChatFlowRuntimeNode;
};

export class ChatFlowNodeExecutor {
  private whatsappMessageService = new WhatsappMessageService();

  async execute(params: ExecuteNodeParams): Promise<void> {
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
      case "chat":
        await this.sendChatNode(params);
        return;
      default:
        logger.warn("WHATSAPP_CHATFLOW_NODE_SKIPPED", {
          reason: "unsupported_node",
          nodeId: params.node.id,
          kind,
        });
    }
  }

  private async sendMessageNode({ accountId, phone, node }: ExecuteNodeParams) {
    const items = Array.isArray(node.data?.payload) ? node.data.payload : [];
    for (const item of items) {
      const type = String(item?.type || "").trim();
      switch (type) {
        case "text": {
          const body = String(item.content || "").trim();
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
          await this.whatsappMessageService.send(accountId, {
            type,
            to: phone,
            source: "automation",
            from: "bot",
            caption: media.caption,
            [type]: {
              link,
              caption: media.caption,
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

  private async sendQuestionNode({ accountId, phone, node }: ExecuteNodeParams) {
    const text = String(node.data?.payload?.question?.text || "").trim();
    if (!text) return;
    await this.sendText(accountId, phone, text);
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
}

export const chatFlowNodeExecutor = new ChatFlowNodeExecutor();
