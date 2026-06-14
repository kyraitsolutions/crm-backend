import { Request, Response } from "express";
import httpResponse from "../../../utils/http.response";
import { IntegrationService } from "../services/integration.service";
import { IntegrationProvider } from "../../../models/integration.model";

export class IntegrationController {
  constructor(private service = new IntegrationService()) {}

  getIntegration = async (req: Request, res: Response) => {
    const result = await this.service.getIntegration({
      accountId: String(req.params.accountId),
      provider: req.params.provider.toUpperCase() as IntegrationProvider,
    });

    httpResponse(req, res, 200, "Integration details", result);
  };

  connectWhatsApp = async (req: Request, res: Response) => {
    const result = await this.service.getWhatsAppConnectUrl({
      accountId: String(req?.query?.accountId),
      organizationId: String(req.user?.organizationId),
    });

    httpResponse(req, res, 200, "WhatsApp connect url", result);
  };

  whatsappCallback = async (req: Request, res: Response) => {
    const code = req.query.code;
    const state = req.query.state;

    const decodedState = JSON.parse(
      Buffer.from(state as string, "base64").toString("utf-8"),
    );

    const result = await this.service.completeWhatsAppSignup({
      code: String(code),
      accountId: decodedState.accountId,
      organizationId: decodedState.organizationId,
    });

    return res.redirect(`${process.env.FRONTEND_URL}/settings/whatsapp`);
  };
}
