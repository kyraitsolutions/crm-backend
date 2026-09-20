import { accountUpdateHandler } from "../handlers/accountUpdate.handler.js";
import { contactSyncHandler } from "../handlers/contactSync.handler.js";
import { messageEchoHandler } from "../handlers/messageEcho.hanlder.js";
import { messagesHandler } from "../handlers/messages.handler.js";
import { templateHandler } from "../handlers/template.handler.js";
import logger from "../../../../utils/logger.js";
import {
  WhatsAppAccountUpdateValueSchema,
  WhatsAppContactSyncValueSchema,
  WhatsAppMessageEchoesValueSchema,
  WhatsAppMessagesValueSchema,
  WhatsAppTemplateWebhookValueSchema,
  WhatsAppWebhookEnvelopeSchema,
  type TWhatsAppWebhookUnknownChange,
} from "../types/index.js";
import type { ZodType } from "zod";

export class WebhookRouterService {
  public async route(payload: unknown): Promise<void> {
    const parsed = WhatsAppWebhookEnvelopeSchema.safeParse(payload);
    if (!parsed.success || !parsed.data.entry?.length) {
      return;
    }

    for (const entry of parsed.data.entry) {
      if (!entry.changes?.length) {
        continue;
      }

      for (const change of entry.changes) {
        await this.dispatch(change);
      }
    }
  }

  private async dispatch(change: TWhatsAppWebhookUnknownChange): Promise<void> {
    switch (change.field) {
      case "messages": {
        const value = this.parseValue(
          WhatsAppMessagesValueSchema,
          change.field,
          change.value,
        );
        if (value) await messagesHandler.handle(value);
        break;
      }

      case "account_update": {
        const value = this.parseValue(
          WhatsAppAccountUpdateValueSchema,
          change.field,
          change.value,
        );
        if (value) await accountUpdateHandler.handle(value);
        break;
      }

      case "smb_message_echoes": {
        const value = this.parseValue(
          WhatsAppMessageEchoesValueSchema,
          change.field,
          change.value,
        );
        if (value) await messageEchoHandler.handle(value);
        break;
      }

      case "smb_app_state_sync": {
        const value = this.parseValue(
          WhatsAppContactSyncValueSchema,
          change.field,
          change.value,
        );
        if (value) await contactSyncHandler.handle(value);
        break;
      }

      // case "history": {
      //   const value = this.parseValue(
      //     WhatsAppHistorySyncValueSchema,
      //     change.field,
      //     change.value,
      //   );
      //   if (value) await historySyncHandler.handle(value);
      //   break;
      // }

      case "message_template_status_update":
      case "message_template_quality_update": {
        const value = this.parseValue(
          WhatsAppTemplateWebhookValueSchema,
          change.field,
          change.value,
        );
        if (value) await templateHandler.handle(value);
        break;
      }

      default:
        logger.info("WHATSAPP_WEBHOOK_IGNORED", { field: change.field });
        break;
    }
  }

  private parseValue<T>(
    schema: ZodType<T>,
    field: string,
    value: unknown,
  ): T | null {
    const parsed = schema.safeParse(value);
    if (parsed.success) return parsed.data;

    logger.warn("WHATSAPP_WEBHOOK_INVALID", {
      field,
      issues: parsed.error.issues.map((issue) => issue.message),
    });
    return null;
  }
}
