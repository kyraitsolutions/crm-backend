import { MessageService } from "../../../../services/messages.service.js";
import type {
  TWhatsAppMessageStatus,
  TWhatsAppMessageStatusesValue,
} from "../types/index.js";

type TMessageStatusUpdate = {
  status: string;
  "analytics.sentAt"?: Date;
  "analytics.deliveredAt"?: Date;
  "analytics.readAt"?: Date;
  "analytics.failedAt"?: Date;
  error?: {
    code?: number;
    title?: string;
    message?: string;
    details?: string;
    href?: string;
    raw: TWhatsAppMessageStatus["errors"];
  };
};

export class MessageStatusHandler {
  private messageService = new MessageService();

  async handle(value: TWhatsAppMessageStatusesValue) {
    for (const status of value.statuses ?? []) {
      await this.updateStatus(status);
    }
  }

  private async updateStatus(status: TWhatsAppMessageStatus) {
    const update: TMessageStatusUpdate = {
      status: status.status,
    };

    const timestamp = status.timestamp
      ? new Date(Number(status.timestamp) * 1000)
      : new Date();

    switch (status.status) {
      case "sent":
        update["analytics.sentAt"] = timestamp;
        break;

      case "delivered":
        update["analytics.deliveredAt"] = timestamp;
        break;

      case "read":
        update["analytics.readAt"] = timestamp;
        break;

      case "failed":
        update["analytics.failedAt"] = timestamp;
        if (status.errors?.length) {
          const error = status.errors[0];
          update.error = {
            code: error.code,
            title: error.title,
            message: error.message,
            details: error.error_data?.details,
            href: error.href,
            raw: status.errors,
          };
        }
        break;
    }

    const messageId = status.id;
    try {
      await this.messageService.updateMessage(messageId, update);
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        (("statusCode" in error && error.statusCode === 404) ||
          ("message" in error && error.message === "Message not found"))
      ) {
        return;
      }
      throw error;
    }

    try {
      const { whatsappBroadcastService } = await import(
        "../../broadcast/services/whatsapp-broadcast.service.js"
      );
      const errorMessage = status.errors?.[0]?.message || status.errors?.[0]?.title;
      await whatsappBroadcastService.applyProviderStatus(
        messageId,
        status.status,
        errorMessage,
      );
    } catch (error) {
      console.log("campaign status update failed", error);
    }
  }
}

export const messageStatusHandler = new MessageStatusHandler();
