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
    const value = String(source || "manual").toLowerCase();
    if ((CHANNELS as readonly string[]).includes(value)) {
      return value as TCreateNotification["channelType"];
    }
    if (value.includes("whatsapp")) return "whatsapp";
    if (value.includes("chat")) return "chatbot";
    if (value.includes("form")) return "webform";
    if (value.includes("hook")) return "webhook";
    return "manual";
  }

  async notify(payload: TCreateNotification & { isPriority?: boolean }) {
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

  async notifyNewLead(input: {
    organizationId: string;
    accountId: string;
    leadId: string;
    name?: string;
    phone?: string;
    email?: string;
    source?: string;
  }) {
    const who = input.name || input.phone || input.email || "a new contact";
    const details = [input.phone, input.email].filter(Boolean).join(" · ");
    return this.notify({
      organizationId: input.organizationId,
      accountId: input.accountId,
      typeId: asEntityId(input.leadId),
      type: "new_lead",
      channelType: this.mapChannel(input.source),
      title: `New lead: ${who}`,
      description: details || "A new lead was created",
      meta: {
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
  }) {
    const who = input.contactName || input.phone || "a customer";
    const platformLabel =
      input.platform === "whatsapp"
        ? "WhatsApp"
        : input.platform === "chatbot"
          ? "Chatbot"
          : input.platform;
    return this.notify({
      organizationId: input.organizationId,
      accountId: input.accountId,
      typeId: input.conversationId,
      type: "message",
      channelType: this.mapChannel(input.platform),
      title: input.isNew
        ? `New ${platformLabel} conversation`
        : `New ${platformLabel} message`,
      description: input.isNew
        ? `${who} started a conversation`
        : input.preview || `New message from ${who}`,
      meta: {
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
