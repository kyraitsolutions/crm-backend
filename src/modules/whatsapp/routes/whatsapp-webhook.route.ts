import { Router } from "express";
import { WebhookController } from "../webhooks/controller/webhook.controller.js";

export class WhatsappWebhookRouter {
  private readonly router: Router;
  private readonly webhookController: WebhookController;

  constructor() {
    this.router = Router();
    this.webhookController = new WebhookController();

    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Meta Verification
    this.router.get("/", this.webhookController.verifyWebhook);

    // Meta Events
    this.router.post("/", this.webhookController.receiveWebhook);
  }

  public getRouter(): Router {
    return this.router;
  }
}
