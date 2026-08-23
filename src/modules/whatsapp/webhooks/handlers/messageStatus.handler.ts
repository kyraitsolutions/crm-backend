import { MessageService } from "../../../../services/messages.service.js";

export class MessageStatusHandler {
  private messageService = new MessageService();

  constructor() {
    this.messageService = new MessageService();
  }

  async handle(value: any) {
    for (const status of value.statuses) {
      await this.updateStatus(status);
    }
  }

  private async updateStatus(status: any) {
    const update: any = {
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
            raw: error,
          };
        }

        break;
    }

    const messageId = status.id;

    await this.messageService.updateMessage(messageId, update);
  }
}

export const messageStatusHandler = new MessageStatusHandler();
