import { Router } from "express";
import { AuthMiddleware } from "../../../middleware/auth.middleware.js";
import { requirePermission } from "../../../middleware/authorization.middleware.js";
import { WhatsAppLiveChatController } from "../live-chat/controllers/whatsapp-live-chat.controller.js";

export class WhatsappLiveChatRouter {
  public router = Router({ mergeParams: true });
  private controller = new WhatsAppLiveChatController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(
      "/context",
      AuthMiddleware.authenticate,
      requirePermission("liveChat.view"),
      this.controller.context,
    );
    this.router.get(
      "/settings",
      AuthMiddleware.authenticate,
      requirePermission("whatsapp.view"),
      this.controller.getSettings,
    );
    this.router.put(
      "/settings",
      AuthMiddleware.authenticate,
      requirePermission("whatsapp.edit"),
      this.controller.updateSettings,
    );
    this.router.post(
      "/conversations/:conversationId/resume",
      AuthMiddleware.authenticate,
      requirePermission("liveChat.edit"),
      this.controller.resumeConversation,
    );
    this.router.post(
      "/conversations/:conversationId/intervene",
      AuthMiddleware.authenticate,
      requirePermission("liveChat.edit"),
      this.controller.claimIntervention,
    );
    this.router.post(
      "/conversations/:conversationId/intervene/accept",
      AuthMiddleware.authenticate,
      requirePermission("liveChat.edit"),
      this.controller.acceptIntervention,
    );
  }

  getRouter() {
    return this.router;
  }
}
