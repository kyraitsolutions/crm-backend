import { ConversationModel } from "../../../../models/conversations.model.js";
import { ChatFlow } from "../../../../models/chatflow.model.js";
import { MessageModel } from "../../../../models/messages.model.js";
import logger from "../../../../utils/logger.js";
import { CHATFLOW_SESSION_STATUS } from "../constants/chatflow-session.constant.js";
import {
  WhatsAppChatFlowSessionModel,
  type WhatsAppChatFlowSession,
} from "../models/whatsapp-chatflow-session.model.js";
import type {
  ChatFlowHandleInboundParams,
  ChatFlowResumeParams,
  ChatFlowRuntimeEdge,
  ChatFlowRuntimeNode,
} from "../types/chatflow-runtime.type.js";
import {
  findNode,
  findStartNode,
  isWaitNode,
  matchOutgoingEdge,
  resolveNextEdge,
} from "../utils/chatflow-graph.util.js";
import { chatFlowNodeExecutor } from "./chatflow-node.executor.js";

const SKIP_INBOUND_TYPES = new Set(["reaction", "unsupported", ""]);
const MAX_AUTO_ADVANCE = 12;

export class WhatsAppChatflowService {
  async handleInbound(params: ChatFlowHandleInboundParams) {
    if (SKIP_INBOUND_TYPES.has(String(params.inboundType || ""))) {
      logger.info("WHATSAPP_CHATFLOW_SKIPPED", {
        reason: "unsupported_inbound_type",
        conversationId: params.conversationId,
        inboundType: params.inboundType,
      });
      return { action: "skipped" as const, reason: "unsupported_inbound_type" };
    }

    const conversation = await ConversationModel.findById(params.conversationId);
    if (!conversation) {
      logger.warn("WHATSAPP_CHATFLOW_SKIPPED", {
        reason: "conversation_not_found",
        conversationId: params.conversationId,
      });
      return { action: "skipped" as const, reason: "conversation_not_found" };
    }

    const liveChat = {
      ...(((conversation.metadata as Record<string, unknown> | undefined)?.liveChat ||
        {}) as Record<string, any>),
    };

    if (liveChat.humanIntervened) {
      logger.info("WHATSAPP_CHATFLOW_SKIPPED", {
        reason: "human_intervened",
        conversationId: params.conversationId,
      });
      return { action: "skipped" as const, reason: "human_intervened" };
    }

    const chatFlowId = String(
      params.chatFlowId || liveChat.chatFlowId || liveChat.flow?.chatFlowId || "",
    );

    if (!chatFlowId) {
      logger.warn("WHATSAPP_CHATFLOW_SKIPPED", {
        reason: "chatflow_not_configured",
        conversationId: params.conversationId,
      });
      return { action: "skipped" as const, reason: "chatflow_not_configured" };
    }

    const session = await this.getOrHydrateSession({
      organizationId: params.organizationId || String(liveChat.organizationId || ""),
      accountId: params.accountId,
      conversationId: params.conversationId,
      phone: params.phone,
      chatFlowId,
      liveChat,
    });

    if (session?.status === CHATFLOW_SESSION_STATUS.COMPLETED) {
      logger.info("WHATSAPP_CHATFLOW_SKIPPED", {
        reason: "flow_completed",
        conversationId: params.conversationId,
        chatFlowId,
      });
      return { action: "skipped" as const, reason: "flow_completed" };
    }

    if (session?.status === CHATFLOW_SESSION_STATUS.PAUSED) {
      logger.info("WHATSAPP_CHATFLOW_SKIPPED", {
        reason: "session_paused",
        conversationId: params.conversationId,
        chatFlowId,
      });
      return { action: "skipped" as const, reason: "session_paused" };
    }

    if (!session && !params.isNewConversation) {
      logger.info("WHATSAPP_CHATFLOW_SKIPPED", {
        reason: "existing_conversation",
        conversationId: params.conversationId,
        chatFlowId,
      });
      return { action: "skipped" as const, reason: "existing_conversation" };
    }

    if (
      session &&
      params.inboundMessageId &&
      (session.startedByMessageId === params.inboundMessageId ||
        session.lastInboundMessageId === params.inboundMessageId)
    ) {
      logger.info("WHATSAPP_CHATFLOW_SKIPPED", {
        reason: "duplicate_inbound",
        conversationId: params.conversationId,
        chatFlowId,
      });
      return { action: "skipped" as const, reason: "duplicate_inbound" };
    }

    const definition = await this.loadPublishedFlow(params.accountId, chatFlowId);

    if (!definition) {
      return { action: "skipped" as const, reason: "chatflow_unavailable" };
    }

    if (!session) {
      return this.startFlow({
        params,
        chatFlowId,
        definition,
      });
    }

    return this.advanceFlow({
      session,
      definition,
      params,
    });
  }

  async pauseByConversation(conversationId: string, reason = "human_intervened") {
    if (!conversationId) return;
    const session = await WhatsAppChatFlowSessionModel.findOne({
      conversationId,
      status: {
        $in: [CHATFLOW_SESSION_STATUS.WAITING, CHATFLOW_SESSION_STATUS.FAILED],
      },
    });
    if (!session) return;

    session.status = CHATFLOW_SESSION_STATUS.PAUSED;
    session.pausedAt = new Date();
    session.pauseReason = reason;
    session.waitingForReply = false;
    await this.persistSession(session);
    logger.info("WHATSAPP_CHATFLOW_PAUSED", {
      conversationId,
      reason,
    });
  }

  async resumeConversation(params: ChatFlowResumeParams) {
    const session = await WhatsAppChatFlowSessionModel.findOne({
      conversationId: params.conversationId,
      accountId: params.accountId,
    });
    if (!session) return { resumed: false, reason: "session_missing" };
    if (session.status === CHATFLOW_SESSION_STATUS.COMPLETED) {
      return { resumed: false, reason: "flow_completed" };
    }

    session.status = CHATFLOW_SESSION_STATUS.WAITING;
    session.waitingForReply = true;
    session.pausedAt = null;
    session.pauseReason = null;
    await this.persistSession(session);

    const lastInbound = await MessageModel.findOne({
      conversationId: params.conversationId,
      direction: "inbound",
      from: "user",
    })
      .sort({ createdAt: -1 })
      .select("messageId searchText body.text type interactive createdAt")
      .lean();

    const lastOutbound = await MessageModel.findOne({
      conversationId: params.conversationId,
      direction: "outbound",
    })
      .sort({ createdAt: -1 })
      .select("createdAt")
      .lean();

    const inboundText = String(
      lastInbound?.searchText || lastInbound?.body?.text || "",
    ).trim();
    const customerIsWaiting =
      Boolean(lastInbound) &&
      inboundText &&
      (!lastOutbound ||
        new Date(lastInbound!.createdAt).getTime() >=
          new Date(lastOutbound.createdAt).getTime());

    if (!customerIsWaiting) {
      logger.info("WHATSAPP_CHATFLOW_RESUMED", {
        conversationId: params.conversationId,
        queued: false,
      });
      return { resumed: true, queued: false };
    }

    const interactive = (lastInbound as { interactive?: Record<string, any> } | null)
      ?.interactive || {};
    await this.handleInbound({
      accountId: params.accountId,
      organizationId: params.organizationId,
      conversationId: params.conversationId,
      phone: session.phone,
      isNewConversation: false,
      chatFlowId: String(session.chatFlowId),
      inboundMessageId: String(lastInbound?.messageId || ""),
      inboundType: String(lastInbound?.type || "text"),
      reply: {
        text: inboundText,
        interactiveId:
          interactive.button_reply?.id || interactive.list_reply?.id || "",
        interactiveTitle:
          interactive.button_reply?.title || interactive.list_reply?.title || "",
      },
    });

    logger.info("WHATSAPP_CHATFLOW_RESUMED", {
      conversationId: params.conversationId,
      queued: true,
    });
    return { resumed: true, queued: true };
  }

  private async getOrHydrateSession(params: {
    organizationId: string;
    accountId: string;
    conversationId: string;
    phone: string;
    chatFlowId: string;
    liveChat: Record<string, any>;
  }) {
    const existing = await WhatsAppChatFlowSessionModel.findOne({
      conversationId: params.conversationId,
    });
    if (existing) return existing;

    const snapshot = params.liveChat.flow;
    if (!snapshot?.startedAt) return null;

    return WhatsAppChatFlowSessionModel.create({
      ...(params.organizationId ? { organizationId: params.organizationId } : {}),
      accountId: params.accountId,
      conversationId: params.conversationId,
      chatFlowId: snapshot.chatFlowId || params.chatFlowId,
      phone: params.phone,
      status: snapshot.completedAt
        ? CHATFLOW_SESSION_STATUS.COMPLETED
        : snapshot.waitingForReply
          ? CHATFLOW_SESSION_STATUS.WAITING
          : CHATFLOW_SESSION_STATUS.PAUSED,
      currentNodeId: snapshot.currentNodeId || null,
      waitingForReply: Boolean(snapshot.waitingForReply),
      startedAt: snapshot.startedAt,
      startedByMessageId: snapshot.startedByMessageId || null,
      lastReplyAt: snapshot.lastReplyAt || null,
      completedAt: snapshot.completedAt || null,
    });
  }

  private async loadPublishedFlow(accountId: string, chatFlowId: string) {
    const flow = await ChatFlow.findOne({
      _id: chatFlowId,
      accountId,
      isDeleted: { $ne: true },
    }).lean();

    if (!flow) {
      logger.warn("WHATSAPP_CHATFLOW_SKIPPED", {
        reason: "chatflow_not_found",
        accountId,
        chatFlowId,
      });
      return null;
    }

    if (!(flow.isPublished || flow.status === "published")) {
      logger.warn("WHATSAPP_CHATFLOW_SKIPPED", {
        reason: "chatflow_not_published",
        accountId,
        chatFlowId,
      });
      return null;
    }

    return {
      nodes: (flow.nodes || []) as ChatFlowRuntimeNode[],
      edges: (flow.edges || []) as ChatFlowRuntimeEdge[],
    };
  }

  private async startFlow(params: {
    params: ChatFlowHandleInboundParams;
    chatFlowId: string;
    definition: { nodes: ChatFlowRuntimeNode[]; edges: ChatFlowRuntimeEdge[] };
  }) {
    const startNode = findStartNode(
      params.definition.nodes,
      params.definition.edges,
    );
    if (!startNode) {
      logger.warn("WHATSAPP_CHATFLOW_SKIPPED", {
        reason: "start_node_missing",
        conversationId: params.params.conversationId,
        chatFlowId: params.chatFlowId,
      });
      return { action: "skipped" as const, reason: "start_node_missing" };
    }

    let session: WhatsAppChatFlowSession;
    try {
      session = await WhatsAppChatFlowSessionModel.create({
        ...(params.params.organizationId
          ? { organizationId: params.params.organizationId }
          : {}),
        accountId: params.params.accountId,
        conversationId: params.params.conversationId,
        chatFlowId: params.chatFlowId,
        phone: params.params.phone,
        status: CHATFLOW_SESSION_STATUS.WAITING,
        currentNodeId: startNode.id,
        waitingForReply: false,
        startedAt: new Date(),
        startedByMessageId: params.params.inboundMessageId || null,
        lastInboundMessageId: params.params.inboundMessageId || null,
      });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: number }).code === 11000
      ) {
        logger.info("WHATSAPP_CHATFLOW_SKIPPED", {
          reason: "session_already_started",
          conversationId: params.params.conversationId,
        });
        return { action: "skipped" as const, reason: "session_already_started" };
      }
      throw error;
    }

    logger.info("WHATSAPP_CHATFLOW_STARTED", {
      conversationId: params.params.conversationId,
      chatFlowId: params.chatFlowId,
      startNodeId: startNode.id,
      sessionId: String(session._id),
    });

    await this.persistSession(session);
    return this.runFromNode({
      session,
      definition: params.definition,
      accountId: params.params.accountId,
      phone: params.params.phone,
      node: startNode,
    });
  }

  private async advanceFlow(params: {
    session: WhatsAppChatFlowSession;
    definition: { nodes: ChatFlowRuntimeNode[]; edges: ChatFlowRuntimeEdge[] };
    params: ChatFlowHandleInboundParams;
  }) {
    const { session, definition } = params;
    const inbound = params.params;

    if (!session.waitingForReply || session.status !== CHATFLOW_SESSION_STATUS.WAITING) {
      logger.info("WHATSAPP_CHATFLOW_SKIPPED", {
        reason: "not_waiting_for_reply",
        conversationId: inbound.conversationId,
        currentNodeId: session.currentNodeId,
        status: session.status,
      });
      return { action: "skipped" as const, reason: "not_waiting_for_reply" };
    }

    const nextEdge = resolveNextEdge(
      definition.nodes,
      definition.edges,
      session.currentNodeId,
      inbound.reply,
    );

    if (!nextEdge) {
      logger.info("WHATSAPP_CHATFLOW_WAITING", {
        reason: "reply_not_matched",
        conversationId: inbound.conversationId,
        currentNodeId: session.currentNodeId,
        reply: inbound.reply.text,
        interactiveId: inbound.reply.interactiveId,
        interactiveTitle: inbound.reply.interactiveTitle,
      });
      return { action: "waiting" as const, reason: "reply_not_matched" };
    }

    const nextNode = findNode(definition.nodes, nextEdge.target);

    if (!nextNode) {
      return this.completeFlow(session, "next_node_missing");
    }

    session.lastReplyAt = new Date();
    session.lastInboundMessageId = inbound.inboundMessageId || session.lastInboundMessageId;
    
    logger.info("WHATSAPP_CHATFLOW_ADVANCED", {
      conversationId: inbound.conversationId,
      fromNodeId: nextEdge.source,
      toNodeId: nextNode.id,
      replyId: inbound.reply.interactiveId,
    });

    return this.runFromNode({
      session,
      definition,
      accountId: inbound.accountId,
      phone: inbound.phone,
      node: nextNode,
    });
  }

  private async runFromNode(params: {
    session: WhatsAppChatFlowSession;
    definition: { nodes: ChatFlowRuntimeNode[]; edges: ChatFlowRuntimeEdge[] };
    accountId: string;
    phone: string;
    node: ChatFlowRuntimeNode;
  }) {
    let node: ChatFlowRuntimeNode | null = params.node;

    for (let step = 0; node && step < MAX_AUTO_ADVANCE; step += 1) {
      params.session.currentNodeId = node.id;
      params.session.waitingForReply = false;

      try {
        await chatFlowNodeExecutor.execute({
          accountId: params.accountId,
          phone: params.phone,
          node,
        });
      } catch (error) {
        params.session.status = CHATFLOW_SESSION_STATUS.FAILED;
        await this.persistSession(params.session);
        logger.error("WHATSAPP_CHATFLOW_NODE_FAILED", {
          conversationId: String(params.session.conversationId),
          nodeId: node.id,
          error: (error as Error).message,
        });
        return { action: "error" as const, reason: "node_send_failed" };
      }

      if (isWaitNode(node)) {
        params.session.status = CHATFLOW_SESSION_STATUS.WAITING;
        params.session.waitingForReply = true;
        await this.persistSession(params.session);
        logger.info("WHATSAPP_CHATFLOW_WAITING", {
          conversationId: String(params.session.conversationId),
          nodeId: node.id,
        });
        return { action: "waiting" as const, nodeId: node.id };
      }

      const nextEdge = matchOutgoingEdge(params.definition.edges, node, { text: "" });
      if (!nextEdge) {
        return this.completeFlow(params.session, "no_outgoing_edge");
      }

      node = findNode(params.definition.nodes, nextEdge.target);
    }

    return this.completeFlow(params.session, "max_auto_advance");
  }

  private async completeFlow(session: WhatsAppChatFlowSession, reason: string) {
    session.status = CHATFLOW_SESSION_STATUS.COMPLETED;
    session.waitingForReply = false;
    session.completedAt = new Date();
    session.completedReason = reason;
    await this.persistSession(session);
    logger.info("WHATSAPP_CHATFLOW_COMPLETED", {
      conversationId: String(session.conversationId),
      chatFlowId: String(session.chatFlowId),
      reason,
    });
    return { action: "completed" as const, reason };
  }

  private async persistSession(session: WhatsAppChatFlowSession) {
    await session.save();
    await ConversationModel.updateOne(
      { _id: session.conversationId },
      {
        $set: {
          "metadata.liveChat.flow": {
            chatFlowId: String(session.chatFlowId),
            currentNodeId: session.currentNodeId,
            waitingForReply: session.waitingForReply,
            status: session.status,
            startedAt: session.startedAt,
            startedByMessageId: session.startedByMessageId,
            lastReplyAt: session.lastReplyAt,
            completedAt: session.completedAt,
            completedReason: session.completedReason,
          },
        },
      },
    );
  }
}

export const whatsappChatflowService = new WhatsAppChatflowService();
