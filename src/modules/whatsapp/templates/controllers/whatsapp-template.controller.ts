import { Request, Response } from "express";
import { WhatsAppTemplateService } from "../services/whatsapp-template.service.js";
export class WhatsappTemplateController {
  private whatsappTemplateService = new WhatsAppTemplateService();

  async createTemplate(req: Request, res: Response) {
    try {
      const { accountId } = req.params;

      const template = await this.whatsappTemplateService.create({
        ...req.body,
        accountId,
      });

      return res.status(201).json({
        success: true,
        message: "Template created successfully",
        data: template,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
}
