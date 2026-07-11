import { Router } from "express";
import { WhatsappAuthRouter } from "./whatsapp-auth.route.js";

export class WhatsappRouter {
  public router: Router;

  private whatsappAuthRouter: WhatsappAuthRouter;
  // private whatsappAccountRouter: whatsappAccountRouter;
  // private whatsappMarketingRouter: whatsappMarketingRouter;
  // private whatsappChatbotRouter: whatsappChatbotRouter;

  constructor() {
    this.router = Router();

    this.whatsappAuthRouter = new WhatsappAuthRouter();
    // this.whatsappAccountRouter = new whatsappAccountRouter();
    // this.whatsappMarketingRouter = new whatsappMarketingRouter();
    // this.whatsappChatbotRouter = new whatsappChatbotRouter();

    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.use("/auth", this.whatsappAuthRouter.getRouter());
    // this.router.use("/account", this.whatsappAccountRouter.getRouter());
    // this.router.use("/marketing", this.whatsappMarketingRouter.getRouter());
    // this.router.use("/chatbot", this.whatsappChatbotRouter.getRouter());
  }

  public getRouter(): Router {
    return this.router;
  }
}