import { NextFunction, Request, Response } from "express";
import AutomationService from "../services/automation.service.js";
import httpResponse from "../utils/http.response.js";
import { AutomationDto, updateAutomationDto } from "../dtos/automation.dto.js";

export default class AutomationController {
  private service: AutomationService;

  constructor() {
    this.service = new AutomationService();
  }

  getAutomations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { accountId } = req.params;
      const result = await this.service.getAutomations(accountId);
      httpResponse(req, res, 200, "Automation fetched successfully", result);
    } catch (error) {
      next(error);
    }
  };

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

      httpResponse(req, res, 201, "Automation created successfully", result);
    } catch (error) {
      next(error);
    }
  };

  updateAutomaton = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { accountId, automationId } = req.params;
      const automationDataPayload = new updateAutomationDto(req.body);

      const context = {
        accountId: String(accountId),
        organizationId: String(req?.user?.organizationId),
        userId: String(req?.user?.organizationId),
        userName: String(req?.user?.name),
      };

      const result = await this.service.updateAutomation(
        automationId,
        context,
        automationDataPayload,
      );
      httpResponse(req, res, 200, "Automation updated successfully", result);
    } catch (error) {
      next(error);
    }
  };

  deleteAutomation = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { accountId, automationId } = req.params;

      const context = {
        accountId: String(accountId),
        organizationId: String(req?.user?.organizationId),
        userId: String(req?.user?.organizationId),
        userName: String(req?.user?.name),
      };

      const result = await this.service.deleteAutomation(automationId, context);
      httpResponse(req, res, 200, "Automation deleted successfully", result);
    } catch (error) {
      next(error);
    }
  };
}
