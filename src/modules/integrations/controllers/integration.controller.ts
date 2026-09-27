import { Request, Response } from "express";
import httpResponse from "../../../utils/http.response.js";
import { IntegrationService } from "../services/integration.service.js";
import { IntegrationProvider } from "../../../models/integration.model.js";
import { routeParam } from "../../../utils/route-param.js";

export class IntegrationController {
  constructor(private service = new IntegrationService()) {}

  getIntegration = async (req: Request, res: Response) => {
    const result = await this.service.getIntegration({
      accountId: String(routeParam(req.params.accountId)),
      provider: routeParam(req.params.provider).toLowerCase() as IntegrationProvider,
    });

    httpResponse(req, res, 200, "Integration details", result);
  };
}
