import { NextFunction, Request, Response } from "express";
import { WhatsAppTemplateService } from "../services/whatsapp-template.service.js";
import httpResponse from "../../../../utils/http.response.js";
import { parseQueryParams } from "../../../../utils/query.utils.js";
export class WhatsappTemplateController {
  private whatsappTemplateService = new WhatsAppTemplateService();

  async getTemplates(req: Request, res: Response, next: NextFunction) {
    try {
      const { accountId } = req.params;
      const query = parseQueryParams(req.query, {
        allowedFilters: ["category", "status", "language"],
      });

      const result = await this.whatsappTemplateService.getTemplates(
        accountId,
        query,
      );

      httpResponse(req, res, 200, "Templates fetched successfully", result);
    } catch (error) {
      next(error);
    }
  }

  async createTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { accountId } = req.params;

      const result = await this.whatsappTemplateService.create({
        ...req.body,
        accountId,
      });

      httpResponse(req, res, 201, "Template created successfully", result);
    } catch (error: any) {
      next(error);
    }
  }
}
