import { Request, Response, NextFunction } from "express";
import { WebhookVerificationService } from "../services/webhook-verification.service.js";
import { WebhookRouterService } from "../services/webhook-router.service.js";

export class WebhookController {
  private readonly verificationService: WebhookVerificationService;
  private readonly webhookRouterService: WebhookRouterService;

  constructor() {
    this.verificationService = new WebhookVerificationService();
    this.webhookRouterService = new WebhookRouterService();
  }

  // GET /api/whatsapp/webhook
  public verifyWebhook = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const challenge = this.verificationService.verify(req.query);
      console.log("WEBHOOK_VERIFICATION", challenge);

      res.status(200).send(challenge);
    } catch (error) {
      next(error);
    }
  };

  // POST /api/whatsapp/webhook
  public receiveWebhook = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      await this.webhookRouterService.route(req.body);

      // Always acknowledge Meta quickly
      res.sendStatus(200);
    } catch (error) {
      next(error);
    }
  };
}
