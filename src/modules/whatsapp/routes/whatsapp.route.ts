import { Router } from "express";
import { WhatsappTemplateRouter } from "./whatsapp-template.route.js";
import { WhatsappWebhookRouter } from "./whatsapp-webhook.route.js";
import { WhatsAppMessageRouter } from "./whatsapp-message.route.js";

export class WhatsappRouter {
  public router: Router;

  private whatsappTemplateRouter: WhatsappTemplateRouter;
  private whatsappWebhookRouter = new WhatsappWebhookRouter();
  private whatsappMessageRouter = new WhatsAppMessageRouter();

  constructor() {
    this.router = Router();
    this.whatsappTemplateRouter = new WhatsappTemplateRouter();
    this.whatsappMessageRouter = new WhatsAppMessageRouter();

    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Templates endpoint
    this.router.use(
      "/account/:accountId/templates",
      this.whatsappTemplateRouter.getRouter(),
    );

    // Messages endpoint
    this.router.use(
      "/account/:accountId/message",
      this.whatsappMessageRouter.getRouter(),
    );

    // Webhook endpoint
    this.router.use("/webhook", this.whatsappWebhookRouter.getRouter());
  }

  public getRouter(): Router {
    return this.router;
  }
}
