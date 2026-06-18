import { NextFunction, Request, Response } from "express";
import AutomationService from "../services/automation.service.js";
import httpResponse from "../utils/http.response.js";
import { AutomationDto } from "../dtos/automation.dto.js";

export default class AutomationController {
  private service = new AutomationService();

  createAutomation = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { accountId } = req.params;
      const automationDataPayload = new AutomationDto(req.body);

      const context = {
        accountId: String(accountId),
        organizationId: String(req?.user?.organizationId),
        userId: String(req?.user?.organizationId),
        userName: String(req?.user?.name),
      };

      const result = await this.service.createAutomation(
        context,
        automationDataPayload,
      );

      httpResponse(req, res, 200, "Automation created successfully", result);
    } catch (error) {
      next(error);
    }
  };
}
