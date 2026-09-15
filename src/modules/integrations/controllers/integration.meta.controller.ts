import { Request, Response } from "express";
import { ENV } from "../../../constants/env.constants.js";
import httpResponse from "../../../utils/http.response.js";
import { DisconnectIntegrationDto } from "../dto/disconnect-integration.dto.js";
import { MetaIntegrationService } from "../services/integration.meta.service.js";

export class MetaIntegrationController {
  constructor(private metaIntegrationService = new MetaIntegrationService()) {}

  public connect = async (req: Request, res: Response) => {
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
      result,
    );
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
}
