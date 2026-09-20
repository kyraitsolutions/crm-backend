import { Request, Response, NextFunction } from "express";
import { ENV } from "../../../constants/env.constants.js";
import httpResponse from "../../../utils/http.response.js";
import { TQueryParams } from "../../../types/api-response.type.js";
import { DisconnectIntegrationDto } from "../dto/disconnect-integration.dto.js";
import { MetaPageService } from "../services/integration.meta-page.service.js";
import { MetaIntegrationService } from "../services/integration.meta.service.js";
import { handleRouteError } from "../../../utils/asyncHandler.js";

export class MetaIntegrationController {
  constructor(
    private metaIntegrationService = new MetaIntegrationService(),
    private metaPageService = new MetaPageService(),
  ) {}

  public connect = async (req: Request, res: Response, next: NextFunction) => {
    try {
    const { accountId } = req.body;
    const organizationId = String(req.user?.organizationId);

    const result = await this.metaIntegrationService.generateMetaAuthUrl({
      organizationId,
      accountId,
    });

    return httpResponse(
      req,
      res,
      200,
      "Meta authorization URL generated successfully",
      { doc: result },
    );
    } catch (error) {
      return handleRouteError("MetaIntegrationController", error, next, req);
    }
  };

  public callback = async (req: Request, res: Response) => {
    const frontendBase = (
      ENV.URL.FRONTEND_URL || "http://localhost:5173"
    ).replace(/\/$/, "");

    const callbackUrl = `${frontendBase}/dashboard/settings/facebook/callback`;

    try {
      const { code, state } = req.query;

      if (!code) {
        return res.redirect(`${callbackUrl}?status=error&message=missing_code`);
      }

      if (!state) {
        return res.redirect(`${callbackUrl}?status=error&message=missing_state`);
      }

      let parsedState: {
        accountId: string;
        organizationId: string;
      };

      try {
        parsedState = JSON.parse(String(state));
      } catch {
        return res.redirect(`${callbackUrl}?status=error&message=invalid_state`);
      }

      const { accountId, organizationId } = parsedState;

      if (!accountId) {
        return res.redirect(`${callbackUrl}?status=error&message=missing_account`);
      }

      if (!organizationId) {
        return res.redirect(
          `${callbackUrl}?status=error&message=missing_organization`,
        );
      }

      await this.metaIntegrationService.completeMetaSignup({
        code: String(code),
        accountId,
        organizationId,
      });

      return res.redirect(`${callbackUrl}?status=success`);
      
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "meta_connect_failed";
      return res.redirect(
        `${callbackUrl}?status=error&message=${encodeURIComponent(message)}`,
      );
    }
  };

  public disconnect = async (req: Request, res: Response) => {
    const { integrationId, accountId } = req.body;
    const dtoDataPayload = new DisconnectIntegrationDto({
      integrationId,
      accountId,
    });

    const result = await this.metaIntegrationService.disconnect(dtoDataPayload);
    return httpResponse(req, res, 200, "Integration details", result);
  };

  public getPosts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.metaPageService.getPosts(
        String(req.params.accountId),
        this.readQuery(req, 12),
      );

      return httpResponse(req, res, 200, "Facebook posts fetched successfully", result);
    } catch (error) {
     return handleRouteError("MetaIntegrationController.getPosts", error, next, req);
    }
  };

  public getLeadForms = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await this.metaPageService.getLeadForms(
        String(req.params.accountId),
        this.readQuery(req, 25),
      );

      return httpResponse(
        req,
        res,
        200,
        "Facebook lead forms fetched successfully",
        result,
      );
    } catch (error) {
      return handleRouteError("MetaIntegrationController.getLeadForms", error, next, req);
    }
  };

  public getLeads = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.metaPageService.getLeads(
        String(req.params.accountId),
        this.readQuery(req, 20),
      );

      return httpResponse(
        req,
        res,
        200,
        "Facebook leads fetched successfully",
        result,
      );
    } catch (error) {
      return handleRouteError("MetaIntegrationController.getLeads", error, next, req);
    }
  };

  public getInsights = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await this.metaPageService.getInsights(
        String(req.params.accountId),
      );

      return httpResponse(
        req,
        res,
        200,
        "Facebook insights fetched successfully",
        result,
      );
    } catch (error) {
      return handleRouteError("MetaIntegrationController.getInsights", error, next, req);
    }
  };

  public setActivePage = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await this.metaIntegrationService.setActivePage({
        accountId: String(req.params.accountId),
        pageId: String(req.body.pageId || ""),
      });

      return httpResponse(
        req,
        res,
        200,
        "Active Facebook Page updated successfully",
        result,
      );
    } catch (error) {
      return handleRouteError(
        "MetaIntegrationController.setActivePage",
        error,
        next,
        req,
      );
    }
  };

  private readQuery(req: Request, defaultLimit: number): TQueryParams {
    return {
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : defaultLimit,
      search: req.query.search ? String(req.query.search) : undefined,
    };
  }
}
