import { Router } from "express";
import { AuthMiddleware } from "../../../middleware/auth.middleware.js";
import { WhatsAppLiveChatController } from "../live-chat/controllers/whatsapp-live-chat.controller.js";

export class WhatsappLiveChatRouter {
  public router = Router({ mergeParams: true });
  private controller = new WhatsAppLiveChatController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get("/context", AuthMiddleware.authenticate, this.controller.context);
    this.router.get(
      "/settings",
      AuthMiddleware.authenticate,
      this.controller.getSettings,
    );
    this.router.put(
      "/settings",
      AuthMiddleware.authenticate,
      this.controller.updateSettings,
    );
  }

  getRouter() {
    return this.router;
  }
}
