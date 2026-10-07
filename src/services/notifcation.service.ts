import { HttpError } from "../utils/http.error.js";
import { AccountRepository } from "../repositories/account.repository.js";
import {
  TCreateNotification,
  TNotification,
} from "../types/notification.type.js";
import { NotificationRepository } from "../repositories/notification.repository.js";
import {
  emitToAccount,
  emitToOrganization,
} from "../config/wsServer/wsEmitter.js";
import logger from "../utils/logger.js";
import { asEntityId } from "../utils/request-context.utils.js";
import { notificationDispatchService } from "../modules/notifications/services/notification-dispatch.service.js";
import { normalizeNotificationSource } from "../modules/notifications/utils/source.util.js";
import { sourceToLegacyChannel } from "../modules/notifications/utils/legacy-type.util.js";

const CHANNELS = [
  "chatbot",
  "website",
  "google_ads",
  "whatsapp",
  "facebook",
  "instagram",
  "webform",
  "manual",
  "webhook",
] as const;

export class NotificationService {
  constructor(
    private accountRepository: AccountRepository,
    private notificationRepository: NotificationRepository,
  ) {}

  async getNotificationByAccountId(accountId: string): Promise<{} | null> {
    const account = this.accountRepository.findOne(accountId);
    if (!account) {
      throw HttpError.notFound("Account not found");
    }
    return account;
  }

  async getAllNotifications(organizationId: string): Promise<{
    docs: TNotification[];
    unreadCount: number;
  }> {
    if (!organizationId) {
      return { docs: [], unreadCount: 0 };
    }
    const [docs, unreadCount] = await Promise.all([
      this.notificationRepository.findAll(organizationId),
      this.notificationRepository.countUnread(organizationId),
    ]);
    return { docs, unreadCount };
  }

  mapChannel(source?: string): TCreateNotification["channelType"] {
    const normalized = normalizeNotificationSource(source);
    if (normalized) {
      return sourceToLegacyChannel(normalized);
    }
    const value = String(source || "manual").toLowerCase();
    if ((CHANNELS as readonly string[]).includes(value)) {
      return value as TCreateNotification["channelType"];
    }
    return "manual";
  }

  /**
   * Legacy entry point. Prefer event-keyed helpers / dispatch().
   * When meta.eventKey is provided, routes through the new dispatcher.
   */
  async notify(
    payload: TCreateNotification & {
      isPriority?: boolean;
      eventKey?: string;
      assigneeId?: string | null;
      recipientUserIds?: string[];
      deepLink?: string | null;
      groupKey?: string | null;
      entityType?: string | null;
      entityId?: string | null;
    },
  ) {
    const eventKey =
      payload.eventKey ||
      (typeof payload.meta?.eventKey === "string"
        ? payload.meta.eventKey
        : null);

    if (eventKey) {
      return notificationDispatchService.dispatch({
        eventKey,
        organizationId: payload.organizationId,
        accountId: payload.accountId,
        source:
          (payload.meta?.source as string | undefined) ||
          payload.channelType ||
          null,
        entityType: payload.entityType || (payload.meta?.entityType as string) || null,
        entityId:
          payload.entityId ||
          (payload.meta?.entityId as string) ||
          payload.typeId,
        assigneeId:
          payload.assigneeId ||
          (payload.meta?.assigneeId as string | undefined) ||
          null,
        title: payload.title,
        body: payload.description || payload.title,
        deepLink: payload.deepLink || (payload.meta?.deepLink as string) || null,
        groupKey: payload.groupKey || (payload.meta?.groupKey as string) || null,
        typeId: payload.typeId,
        payload: payload.meta,
        recipientUserIds: payload.recipientUserIds,
        isPriority: payload.isPriority,
      });
    }

    // Fallback: legacy path without event registry (should be rare)
    const organizationId = asEntityId(payload.organizationId);
    const accountId = asEntityId(payload.accountId);
    const typeId = asEntityId(payload.typeId);
    if (!organizationId || !accountId || !typeId) {
      logger.warn("Skipped notification, missing identifiers", {
        organizationId,
        accountId,
        type: payload.type,
      });
      return null;
    }

    const notification = await this.notificationRepository.findByTypeIdAndUpdate(
      {
        ...payload,
        organizationId,
        accountId,
        typeId,
        description: payload.description || payload.title,
      },
    );

    const eventPayload = { notification };

    emitToOrganization({
      organizationId,
      accountId,
      event: "NEW_NOTIFICATION",
      data: eventPayload,
    });

    emitToAccount(accountId, "NEW_NOTIFICATION", eventPayload);

    return notification;
  }

  async dispatch(
    input: Parameters<typeof notificationDispatchService.dispatch>[0],
  ) {
    return notificationDispatchService.dispatch(input);
  }

  async notifyNewLead(input: {
    organizationId: string;
    accountId: string;
    leadId: string;
    name?: string;
    phone?: string;
    email?: string;
    source?: string;
    assigneeId?: string | null;
    leadScore?: number | null;
  }) {
    const who = input.name || input.phone || input.email || "a new contact";
    const details = [input.phone, input.email].filter(Boolean).join(" · ");
    return this.dispatch({
      eventKey: "lead.created",
      organizationId: input.organizationId,
      accountId: input.accountId,
      source: input.source,
      entityType: "lead",
      entityId: input.leadId,
      typeId: asEntityId(input.leadId),
      assigneeId: input.assigneeId,
      leadScore: input.leadScore,
      title: `New lead: ${who}`,
      body: details || "A new lead was created",
      deepLink: `/leads/${input.leadId}`,
      payload: {
        leadId: input.leadId,
        accountId: input.accountId,
        source: input.source,
      },
    });
  }

  async notifyConversation(input: {
    organizationId: string;
    accountId: string;
    conversationId: string;
    platform: string;
    isNew: boolean;
    contactName?: string;
    phone?: string;
    preview?: string;
    assigneeId?: string | null;
  }) {
    const who = input.contactName || input.phone || "a customer";
    const platformLabel =
      input.platform === "whatsapp"
        ? "WhatsApp"
        : input.platform === "chatbot"
          ? "Chatbot"
          : input.platform;
    return this.dispatch({
      eventKey: "conversation.message_received",
      organizationId: input.organizationId,
      accountId: input.accountId,
      source: input.platform,
      entityType: "conversation",
      entityId: input.conversationId,
      typeId: input.conversationId,
      assigneeId: input.assigneeId,
      title: input.isNew
        ? `New ${platformLabel} conversation`
        : `New ${platformLabel} message`,
      body: input.isNew
        ? `${who} started a conversation`
        : input.preview || `New message from ${who}`,
      deepLink: `/conversations/${input.conversationId}`,
      groupKey: `conversation.message_received:${input.conversationId}`,
      payload: {
        conversationId: input.conversationId,
        accountId: input.accountId,
        platform: input.platform,
        phone: input.phone,
      },
    });
  }

  async markAsRead(organizationId: string, notificationId: string) {
    const updated = await this.notificationRepository.markAsRead(
      notificationId,
      organizationId,
    );
    if (!updated) {
      throw HttpError.notFound("Notification not found");
    }
    return updated.toJSON();
  }

  async markAllAsRead(organizationId: string) {
    await this.notificationRepository.markAllAsRead(organizationId);
  }
}
