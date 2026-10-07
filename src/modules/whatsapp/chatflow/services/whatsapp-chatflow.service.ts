import { Types } from "mongoose";
import { ConversationModel } from "../../../../models/conversations.model.js";
import { ContactModel } from "../../../../models/contact.model.js";
import { ChatFlow } from "../../../../models/chatflow.model.js";
import { MessageModel } from "../../../../models/messages.model.js";
import { enqueueChatflowDelay } from "../../../../queue/whatsapp/chatflow-delay.queue.js";
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
  nodeKind,
  outgoingEdges,
  resolveNextEdge,
} from "../utils/chatflow-graph.util.js";
import {
  delayMilliseconds,
  matchesKeyword,
  mayKeywordStartOnExisting,
  questionAttributeKey,
  resolveTemplateVariables,
  syncResolvedVariables,
  validateQuestionReply,
  type FlowVariables,
} from "../utils/chatflow-logic.util.js";
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

    const startNode = findStartNode(definition.nodes, definition.edges);
    const keywordMatched =
      !!startNode &&
      nodeKind(startNode) === "keyword" &&
      keywordMatches(startNode, params.reply.text);

    if (!session) {
      if (!params.isNewConversation) {
        const startKind = startNode ? nodeKind(startNode) : "";
        if (startKind !== "keyword") {
          logger.info("WHATSAPP_CHATFLOW_SKIPPED", {
            reason: "existing_conversation",
            conversationId: params.conversationId,
            chatFlowId,
          });
          return { action: "skipped" as const, reason: "existing_conversation" };
        }
        if (!mayKeywordStartOnExisting(startKind, keywordMatched)) {
          logger.info("WHATSAPP_CHATFLOW_SKIPPED", {
            reason: "keyword_not_matched",
            conversationId: params.conversationId,
            chatFlowId,
          });
          return { action: "skipped" as const, reason: "keyword_not_matched" };
        }
      }

      return this.startFlow({
        params,
        chatFlowId,
        definition,
      });
    }

    if (mayKeywordStartOnExisting(startNode ? nodeKind(startNode) : "", keywordMatched) && startNode) {
      await this.resetSessionForKeywordStart({
        session,
        startNode,
        chatFlowId,
        inbound: params,
      });
      logger.info("WHATSAPP_CHATFLOW_KEYWORD_RETRIGGER", {
        conversationId: params.conversationId,
        chatFlowId,
        startNodeId: startNode.id,
        sessionId: String(session._id),
      });
      return this.runFromNode({
        session,
        definition,
        accountId: params.accountId,
        phone: params.phone,
        node: startNode,
        replyText: params.reply.text,
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
        $in: [
          CHATFLOW_SESSION_STATUS.WAITING,
          CHATFLOW_SESSION_STATUS.DELAYED,
          CHATFLOW_SESSION_STATUS.FAILED,
        ],
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

  async resumeDelayed(sessionId: string, token: string) {
    const session = await WhatsAppChatFlowSessionModel.findOneAndUpdate(
      {
        _id: sessionId,
        status: CHATFLOW_SESSION_STATUS.DELAYED,
        delayToken: token,
      },
      {
        $set: {
          status: CHATFLOW_SESSION_STATUS.WAITING,
          delayToken: "",
          waitingForReply: false,
        },
      },
      { new: true },
    );
    if (!session) return { action: "skipped" as const, reason: "delay_not_pending" };

    const conversation = await ConversationModel.findById(session.conversationId);
    const liveChat = ((conversation?.metadata as Record<string, any> | undefined)?.liveChat ||
      {}) as Record<string, any>;
    if (!conversation || conversation.isDeleted) {
      return this.completeFlow(session, "conversation_unavailable");
    }
    if (liveChat.humanIntervened) {
      session.status = CHATFLOW_SESSION_STATUS.PAUSED;
      session.pauseReason = "human_intervened";
      session.pausedAt = new Date();
      await this.persistSession(session);
      return { action: "paused" as const, reason: "human_intervened" };
    }

    const digits = String(session.phone || "").replace(/\D/g, "");
    const contact = digits
      ? await ContactModel.findOne({
          accountId: session.accountId,
          phone: { $regex: `${digits.slice(-10)}$` },
        })
      : null;
    if (contact && (contact.whatsapp?.optIn === false || contact.status === "unsubscribed")) {
      return this.completeFlow(session, "opted_out");
    }

    const definition = await this.loadPublishedFlow(
      String(session.accountId),
      String(session.chatFlowId),
    );
    const current = definition ? findNode(definition.nodes, session.currentNodeId) : null;
    const nextEdge = current ? outgoingEdges(definition!.edges, current.id)[0] : null;
    const nextNode = nextEdge && definition ? findNode(definition.nodes, nextEdge.target) : null;
    if (!definition || !current || nodeKind(current) !== "delay" || !nextNode) {
      return this.completeFlow(session, "delay_target_missing");
    }

    return this.runFromNode({
      session,
      definition,
      accountId: String(session.accountId),
      phone: session.phone,
      node: nextNode,
      replyText: session.variables?.reply || "",
    });
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

  private async resetSessionForKeywordStart(params: {
    session: WhatsAppChatFlowSession;
    startNode: ChatFlowRuntimeNode;
    chatFlowId: string;
    inbound: ChatFlowHandleInboundParams;
  }) {
    const { session, startNode, chatFlowId, inbound } = params;
    session.chatFlowId = new Types.ObjectId(chatFlowId);
    session.status = CHATFLOW_SESSION_STATUS.WAITING;
    session.currentNodeId = startNode.id;
    session.waitingForReply = false;
    session.startedAt = new Date();
    session.startedByMessageId = inbound.inboundMessageId || null;
    session.lastInboundMessageId = inbound.inboundMessageId || null;
    session.lastReplyAt = null;
    session.pausedAt = null;
    session.pauseReason = null;
    session.completedAt = null;
    session.completedReason = null;
    session.jumpCount = 0;
    session.delayToken = "";
    session.resumeAt = null;
    session.variables = {
      reply: inbound.reply.text || "",
      phone: inbound.phone || "",
      __visitedFlows: chatFlowId,
    };
    session.markModified("variables");
    await this.persistSession(session);
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

    if (
      nodeKind(startNode) === "keyword" &&
      !keywordMatches(startNode, params.params.reply.text)
    ) {
      return { action: "skipped" as const, reason: "keyword_not_matched" };
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
        variables: {
          reply: params.params.reply.text || "",
          phone: params.params.phone || "",
          __visitedFlows: params.chatFlowId,
        },
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
      replyText: params.params.reply.text,
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

    const waitingNode = findNode(definition.nodes, session.currentNodeId);
    const waitingKind = nodeKind(waitingNode);
    session.variables = session.variables || {};
    if (waitingKind === "question" && waitingNode) {
      const retry = await this.keepInvalidQuestion(session, waitingNode, inbound);
      if (retry) return retry;
    }
    if (waitingKind === "ask_address") session.variables.address = inbound.reply.text;
    if (waitingKind === "ask_location") session.variables.location = inbound.reply.text;
    if (waitingKind === "ask_media") session.variables.media = inbound.reply.text;
    session.markModified("variables");

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
      replyText: inbound.reply.text,
    });
  }

  private async runFromNode(params: {
    session: WhatsAppChatFlowSession;
    definition: { nodes: ChatFlowRuntimeNode[]; edges: ChatFlowRuntimeEdge[] };
    accountId: string;
    phone: string;
    node: ChatFlowRuntimeNode;
    replyText?: string;
  }) {
    let node: ChatFlowRuntimeNode | null = params.node;
    let definition = params.definition;
    params.session.variables = params.session.variables || {};
    if (params.replyText) params.session.variables.reply = params.replyText;
    params.session.variables.phone = params.phone || params.session.variables.phone || "";
    const variableSources = await this.loadInterpolationSources(
      params.session,
      params.accountId,
    );

    for (let step = 0; node && step < MAX_AUTO_ADVANCE; step += 1) {
      params.session.currentNodeId = node.id;
      params.session.waitingForReply = false;

      if (nodeKind(node) === "delay") {
        const waitMs = delayMilliseconds(node.data?.payload?.delay);
        if (waitMs > 0) {
          const token = `${node.id}:${Date.now()}`;
          params.session.status = CHATFLOW_SESSION_STATUS.DELAYED;
          params.session.delayToken = token;
          params.session.resumeAt = new Date(Date.now() + waitMs);
          params.session.waitingForReply = false;
          await this.persistSession(params.session);
          try {
            await enqueueChatflowDelay(
              {
                sessionId: String(params.session._id),
                token,
                accountId: params.accountId,
                conversationId: String(params.session.conversationId),
              },
              waitMs,
            );
          } catch (error) {
            params.session.status = CHATFLOW_SESSION_STATUS.FAILED;
            await this.persistSession(params.session);
            logger.error("WHATSAPP_CHATFLOW_DELAY_SCHEDULE_FAILED", {
              conversationId: String(params.session.conversationId),
              nodeId: node.id,
              error: (error as Error).message,
            });
            return { action: "error" as const, reason: "delay_schedule_failed" };
          }
          return { action: "delayed" as const, nodeId: node.id };
        }
      }

      if (nodeKind(node) === "connect_flow") {
        const targetId = String(node.data?.payload?.connect?.chatFlowId || "");
        const visited = new Set(
          String(params.session.variables.__visitedFlows || "")
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean),
        );
        visited.add(String(params.session.chatFlowId));
        if (!targetId || visited.has(targetId)) {
          return this.completeFlow(params.session, "connect_flow_cycle");
        }
        visited.add(targetId);
        params.session.variables.__visitedFlows = [...visited].join(",");
        const nextDefinition = await this.loadPublishedFlow(params.accountId, targetId);
        const start = nextDefinition
          ? findStartNode(nextDefinition.nodes, nextDefinition.edges)
          : null;
        if (!nextDefinition || !start) {
          return this.completeFlow(params.session, "connect_flow_missing");
        }
        if (Types.ObjectId.isValid(targetId)) {
          params.session.chatFlowId = new Types.ObjectId(targetId);
        }
        definition = nextDefinition;
        node = start;
        continue;
      }

      let result: { stop?: boolean; jumpTo?: string; branch?: string } | void;
      try {
        const resolved = resolveTemplateVariables({
          session: params.session.variables,
          conversation: variableSources.conversation,
          contact: variableSources.contact,
        });
        const before = { ...resolved };
        result = await chatFlowNodeExecutor.execute({
          accountId: params.accountId,
          phone: params.phone,
          node,
          conversationId: String(params.session.conversationId),
          variables: resolved,
        });
        syncResolvedVariables(params.session.variables, before, resolved);
        params.session.markModified("variables");
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

      if (result?.stop) {
        if (nodeKind(node) === "handoff") {
          params.session.status = CHATFLOW_SESSION_STATUS.PAUSED;
          params.session.pauseReason = "chatflow_handoff";
          params.session.pausedAt = new Date();
          params.session.waitingForReply = false;
          await this.persistSession(params.session);
          return { action: "paused" as const, reason: "chatflow_handoff" };
        }
        return this.completeFlow(params.session, "ended");
      }

      if (result?.jumpTo) {
        params.session.jumpCount = Number(params.session.jumpCount || 0) + 1;
        if (params.session.jumpCount > 8) {
          return this.completeFlow(params.session, "jump_limit");
        }
        const target = findNode(definition.nodes, result.jumpTo);
        if (!target || target.id === node.id) {
          return this.completeFlow(params.session, "jump_invalid");
        }
        node = target;
        continue;
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

      const edges = outgoingEdges(definition.edges, node.id);
      const nextEdge = result?.branch
        ? edges.find((edge) => edge.sourceHandle === result.branch) || null
        : matchOutgoingEdge(definition.edges, node, { text: "" });
      if (!nextEdge) {
        return this.completeFlow(
          params.session,
          result?.branch ? "branch_missing" : "no_outgoing_edge",
        );
      }

      node = findNode(definition.nodes, nextEdge.target);
    }

    return this.completeFlow(params.session, "max_auto_advance");
  }

  private async loadInterpolationSources(
    session: WhatsAppChatFlowSession,
    accountId: string,
  ) {
    try {
      const digits = String(session.phone || "").replace(/\D/g, "");
      const contact = digits
        ? await ContactModel.findOne({
            accountId,
            phone: { $regex: `${digits.slice(-10)}$` },
          }).select("name phone email attributes")
        : null;
      const conversation = await ConversationModel.findById(session.conversationId).select(
        "metadata",
      );
      const metadata = (conversation?.metadata || {}) as Record<string, unknown>;
      const conversationAttributes = metadata.chatflowAttributes;
      return {
        contact: contact
          ? {
              name: contact.name,
              phone: contact.phone,
              email: contact.email,
              attributes: (contact.attributes || {}) as FlowVariables,
            }
          : null,
        conversation:
          conversationAttributes && typeof conversationAttributes === "object"
            ? (conversationAttributes as FlowVariables)
            : null,
      };
    } catch (error) {
      logger.warn("WHATSAPP_CHATFLOW_VARIABLE_SOURCE_FAILED", {
        conversationId: String(session.conversationId),
        error: (error as Error).message,
      });
      return { contact: null, conversation: null };
    }
  }

  private async keepInvalidQuestion(
    session: WhatsAppChatFlowSession,
    node: ChatFlowRuntimeNode,
    inbound: ChatFlowHandleInboundParams,
  ) {
    const question = node.data?.payload?.question || {};
    const answer = String(inbound.reply.interactiveTitle || inbound.reply.text || "").trim();
    const result = validateQuestionReply({
      inputType: question.inputType,
      required: question.required,
      options: question.options,
      text: answer,
      inboundType: inbound.inboundType,
    });
    const key = questionAttributeKey(question.inputType, question.attribute);
    if (result.ok) {
      if (key) {
        session.variables[key] =
          result.value || (question.inputType === "media" ? String(inbound.inboundType || "media") : "");
        session.variables[`${key}_valid`] = "true";
      }
      session.markModified("variables");
      return null;
    }

    const attemptsKey = `q_${String(node.id).replace(/[^a-zA-Z0-9_]/g, "")}_attempts`;
    const attempts = Number(session.variables[attemptsKey] || 0) + 1;
    const maxAttempts = Math.min(5, Math.max(1, Number(question.maxAttempts || 2)));
    session.variables[attemptsKey] = String(attempts);
    session.lastInboundMessageId = inbound.inboundMessageId || session.lastInboundMessageId;
    session.lastReplyAt = new Date();

    if (attempts >= maxAttempts) {
      if (key) {
        session.variables[key] = result.value;
        session.variables[`${key}_valid`] = "false";
      }
      session.markModified("variables");
      return null;
    }

    const retryText =
      String(question.retryMessage || "").trim() ||
      "That answer was not valid. Please try again.";
    await chatFlowNodeExecutor.sendCustomerText(inbound.accountId, inbound.phone, retryText);
    session.waitingForReply = true;
    session.status = CHATFLOW_SESSION_STATUS.WAITING;
    session.markModified("variables");
    await this.persistSession(session);
    return { action: "waiting" as const, reason: "invalid_reply", nodeId: node.id };
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

function keywordMatches(node: ChatFlowRuntimeNode, text: string) {
  return matchesKeyword(node.data?.payload?.keyword, text);
}

export const whatsappChatflowService = new WhatsAppChatflowService();
