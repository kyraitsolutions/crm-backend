import { Router } from "express";
import { WhatsappTemplateRouter } from "./whatsapp-template.route.js";
import { WhatsappWebhookRouter } from "./whatsapp-webhook.route.js";
import { WhatsAppMessageRouter } from "./whatsapp-message.route.js";
import { WhatsappAccountRouter } from "./whatsapp-account.route.js";
import { WhatsappBroadcastRouter } from "./whatsapp-broadcast.route.js";
import { WhatsappLiveChatRouter } from "./whatsapp-live-chat.route.js";

export class WhatsappRouter {
  public router: Router;

  private whatsappTemplateRouter: WhatsappTemplateRouter;
  private whatsappWebhookRouter = new WhatsappWebhookRouter();
  private whatsappMessageRouter = new WhatsAppMessageRouter();
  private whatsappAccountRouter = new WhatsappAccountRouter();
  private whatsappBroadcastRouter = new WhatsappBroadcastRouter();
  private whatsappLiveChatRouter = new WhatsappLiveChatRouter();

  constructor() {
    this.router = Router();
    this.whatsappTemplateRouter = new WhatsappTemplateRouter();
    this.whatsappMessageRouter = new WhatsAppMessageRouter();
    this.whatsappAccountRouter = new WhatsappAccountRouter();

    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Account endpoint
    this.router.use(
      "/account/:accountId",
      this.whatsappAccountRouter.getRouter(),
    );

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

    this.router.use(
      "/account/:accountId/broadcast",
      this.whatsappBroadcastRouter.getRouter(),
    );

    this.router.use(
      "/account/:accountId/live-chat",
      this.whatsappLiveChatRouter.getRouter(),
    );

    // Webhook endpoint
    this.router.use("/webhook", this.whatsappWebhookRouter.getRouter());
  }

  public getRouter(): Router {
    return this.router;
  }
}
