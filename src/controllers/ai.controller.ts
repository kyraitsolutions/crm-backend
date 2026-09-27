import { Request, Response, NextFunction } from "express";
import { handleRouteError } from "../utils/asyncHandler.js";
import httpResponse from "../utils/http.response.js";
import { AiService } from "../services/ai.service.js";
import { routeParam } from "../utils/route-param.js";

export class AIController {
  private aiService: AiService;

  constructor() {
    this.aiService = new AiService();
  }

  getLeadSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const accountId = routeParam(req.params.accountId);
      const leadId = routeParam(req.params.leadId);
      const leadSummary = await this.aiService.getLeadSummary(
        accountId,
        leadId,
      );

      httpResponse(req, res, 200, "Lead summary fetched successfully", {
        doc: leadSummary,
      });
    } catch (error) {
      handleRouteError("AIController", error, next, req);
    }
  };

  createTemplateContent = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const accountId = routeParam(req.params.accountId);
      const { aiPrompt } = req.body;
      const templateContent = await this.aiService.createTemplateContent(
        accountId,
        aiPrompt,
      );

      httpResponse(req, res, 200, "Template content created successfully", {
        doc: templateContent,
      });
    } catch (error) {
      handleRouteError("AIController", error, next, req);
    }
  };
}
