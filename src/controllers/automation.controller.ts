import { NextFunction, Request, Response } from "express";
import { handleRouteError } from "../utils/asyncHandler.js";
import AutomationService from "../services/automation.service.js";
import httpResponse from "../utils/http.response.js";
import { AutomationDto, updateAutomationDto } from "../dtos/automation.dto.js";
import { routeParam } from "../utils/route-param.js";

export default class AutomationController {
  private service: AutomationService;

  constructor() {
    this.service = new AutomationService();
  }

  getAutomations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const accountId = routeParam(req.params.accountId);
      const result = await this.service.getAutomations(accountId);
      httpResponse(req, res, 200, "Automation fetched successfully", result);
    } catch (error) {
      handleRouteError("AutomationController", error, next, req);
    }
  };

  createAutomation = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const accountId = routeParam(req.params.accountId);

      const automationDataPayload = new AutomationDto(req.body);

      const context = {
        accountId: String(accountId),
        organizationId: String(req?.user?.organizationId),
        userId: String(req?.user?.id),
        userName: String(req?.user?.name || ""),
      };

      const result = await this.service.createAutomation(
        context,
        automationDataPayload,
      );

      httpResponse(req, res, 201, "Automation created successfully", result);
    } catch (error) {
      handleRouteError("AutomationController", error, next, req);
    }
  };

  updateAutomaton = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const accountId = routeParam(req.params.accountId);
      const automationId = routeParam(req.params.automationId);
      const automationDataPayload = new updateAutomationDto(req.body);

      const context = {
        accountId: String(accountId),
        organizationId: String(req?.user?.organizationId),
        userId: String(req?.user?.id),
        userName: String(req?.user?.name || ""),
      };

      const result = await this.service.updateAutomation(
        automationId,
        context,
        automationDataPayload,
      );
      httpResponse(req, res, 200, "Automation updated successfully", result);
    } catch (error) {
      handleRouteError("AutomationController", error, next, req);
    }
  };

  deleteAutomation = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const accountId = routeParam(req.params.accountId);
      const automationId = routeParam(req.params.automationId);

      const context = {
        accountId: String(accountId),
        organizationId: String(req?.user?.organizationId),
        userId: String(req?.user?.id),
        userName: String(req?.user?.name || ""),
      };

      const result = await this.service.deleteAutomation(automationId, context);
      httpResponse(req, res, 200, "Automation deleted successfully", result);
    } catch (error) {
      handleRouteError("AutomationController", error, next, req);
    }
  };
}
