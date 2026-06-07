import { NextFunction, Request, Response } from "express";
import AutomationService from "../services/automation.service";
import httpResponse from "../utils/http.response";
import { AutomationDto } from "../dtos/automation.dto";

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

      const result = await this.service.createAutomation(
        accountId,
        automationDataPayload,
      );

      httpResponse(req, res, 200, "Automation created successfully", {
        doc: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
