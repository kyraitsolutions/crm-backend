import { notificationDispatchService } from "../../../notifications/services/notification-dispatch.service.js";
import logger from "../../../../utils/logger.js";
import { AccountModel } from "../../../../models/accounts.model.js";
import { WhatsappTemplateModel } from "../../templates/models/template.model.js";
import type { TWhatsAppTemplateWebhookValue } from "../types/index.js";

type TemplateWebhookField =
  | "message_template_status_update"
  | "message_template_quality_update";

export class TemplateHandler {
  public async handle(
    payload: TWhatsAppTemplateWebhookValue,
    field: TemplateWebhookField = "message_template_status_update",
  ): Promise<void> {
    const {
      message_template_id,
      event,
      message_template_name,
      message_template_category,
      reason,
    } = payload;

    const template = await WhatsappTemplateModel.findOne({
      metaTemplateId: message_template_id,
    });

    if (!template) {
      throw new Error(`Template not found: ${message_template_id}`);
    }

    // Meta deleted the template
    if (event === "PENDING_DELETION") {
      await WhatsappTemplateModel.deleteOne({
        metaTemplateId: message_template_id,
      });
      await this.notifyTemplateEvent({
        field,
        template: {
          accountId: template.accountId,
          name: String(template.name || ""),
          _id: template._id,
        },
        payload,
        title: `WhatsApp template deleted: ${message_template_name || template.name}`,
        body: "Meta marked this template for deletion.",
      });
      return;
    }

    const updatedTemplatePayload = {
      status: event,
      name: message_template_name,
      category: message_template_category,
      metaTemplateId: message_template_id,
      rejectedReason: reason,
    };

    await WhatsappTemplateModel.updateOne(
      { metaTemplateId: message_template_id },
      updatedTemplatePayload,
    );

    const isQuality = field === "message_template_quality_update";
    const payloadExtra = payload as TWhatsAppTemplateWebhookValue & {
      new_quality_score?: string | number;
      message_template_quality?: string | number;
    };
    const qualityScore =
      payloadExtra.new_quality_score ||
      payloadExtra.message_template_quality ||
      null;

    await this.notifyTemplateEvent({
      field,
      template: {
        accountId: template.accountId,
        name: String(template.name || ""),
        _id: template._id,
      },
      payload,
      title: isQuality
        ? `WhatsApp template quality updated: ${message_template_name || template.name}`
        : `WhatsApp template ${String(event || "updated").toLowerCase()}: ${message_template_name || template.name}`,
      body: isQuality
        ? `Quality rating is now ${String(qualityScore || "updated")}.`
        : reason
          ? String(reason)
          : `Template status is now ${String(event || "updated")}.`,
    });
  }

  private async notifyTemplateEvent(params: {
    field: TemplateWebhookField;
    template: { accountId?: unknown; name?: string; _id?: unknown };
    payload: TWhatsAppTemplateWebhookValue;
    title: string;
    body: string;
  }) {
    try {
      const accountId = String(params.template.accountId || "");
      if (!accountId) return;

      const account = await AccountModel.findById(accountId)
        .select("organizationId")
        .lean();
      const organizationId = String(account?.organizationId || "");
      if (!organizationId) return;

      const eventKey =
        params.field === "message_template_quality_update"
          ? "whatsapp.quality_changed"
          : "whatsapp.template_status_changed";

      const templateId = String(
        params.payload.message_template_id || params.template._id || "",
      );

      await notificationDispatchService.dispatch({
        eventKey,
        organizationId,
        accountId,
        source: "whatsapp",
        entityType: "whatsapp_template",
        entityId: templateId,
        typeId: `wa-template:${templateId}:${params.field}`,
        title: params.title,
        body: params.body,
        deepLink: "/channels/whatsapp/templates",
        payload: {
          metaTemplateId: params.payload.message_template_id,
          event: params.payload.event,
          reason: params.payload.reason,
          field: params.field,
        },
      });
    } catch (error) {
      logger.warn("WHATSAPP_TEMPLATE_NOTIFICATION_SKIPPED", {
        error: error instanceof Error ? error.message : String(error),
        field: params.field,
        templateId: params.payload.message_template_id,
      });
    }
  }
}

export const templateHandler = new TemplateHandler();
