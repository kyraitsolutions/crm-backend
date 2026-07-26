import { WhatsappTemplateModel } from "../../templates/models/template.model.js";
import { TemplateWebhookPayload } from "../types/template.types.js";

export class TemplateHandler {
  public async handle(payload: TemplateWebhookPayload): Promise<void> {
    console.log("TemplateHandler", payload);

    const {
      message_template_id,
      event,
      message_template_name,
      message_template_category,
    } = payload;

    const isTemplateExist = await WhatsappTemplateModel.findOne({
      metaTemplateId: message_template_id,
    });

    console.log("isTemplateExist", isTemplateExist);

    if (!isTemplateExist) {
      throw new Error("Template not found");
    }

    const updatedTemplatePayload = {
      status: event,
      name: message_template_name,
      category: message_template_category,
      metaTemplateId: message_template_id,
    };

    await WhatsappTemplateModel.updateOne(
      { metaTemplateId: message_template_id },
      updatedTemplatePayload,
    );

    return;
  }
}

export const templateHandler = new TemplateHandler();
