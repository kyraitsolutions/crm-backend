import { Request, Response } from "express";
import { WhatsAppIntegrationService } from "../services/integration.whatsapp.service.js";
import httpResponse from "../../../utils/http.response.js";
import { DisconnectIntegrationDto } from "../dto/disconnect-integration.dto.js";

export class WhatsAppIntegrationController {
  constructor(private service = new WhatsAppIntegrationService()) {}

  connect = async (req: Request, res: Response) => {
    const { code, accountId } = req.body;
    const organizationId = String(req.user?.organizationId);

    const result = await this.service.completeWhatsAppSignup({
      code: String(code),
      accountId,
      organizationId,
    });

    httpResponse(req, res, 200, "Integration details", result);
  };

  disconnect = async (req: Request, res: Response) => {
    const { integrationId, accountId } = req.body;
    const dtoDataPayload = new DisconnectIntegrationDto({
      integrationId,
      accountId,
    });

    const result = await this.service.disconnect(dtoDataPayload);
    httpResponse(req, res, 200, "Integration details", result);
  };
}
