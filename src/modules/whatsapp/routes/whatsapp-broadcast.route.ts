import { Router } from "express";
import { AuthMiddleware } from "../../../middleware/auth.middleware.js";
import { requirePermission } from "../../../middleware/authorization.middleware.js";
import { WhatsAppBroadcastController } from "../broadcast/controllers/whatsapp-broadcast.controller.js";

export class WhatsappBroadcastRouter {
  public router = Router({ mergeParams: true });
  private controller = new WhatsAppBroadcastController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(
      "/context",
      AuthMiddleware.authenticate,
      requirePermission("whatsappMarketing.view"),
      this.controller.context,
    );
    this.router.get(
      "/overview",
      AuthMiddleware.authenticate,
      requirePermission("whatsappMarketing.view"),
      this.controller.overview,
    );
    this.router.get(
      "/templates",
      AuthMiddleware.authenticate,
      requirePermission("whatsappMarketing.view"),
      this.controller.templates,
    );
    this.router.post(
      "/audiences/preview",
      AuthMiddleware.authenticate,
      requirePermission("whatsappMarketing.view"),
      this.controller.previewAudience,
    );
    this.router.post(
      "/test",
      AuthMiddleware.authenticate,
      requirePermission("whatsappMarketing.send"),
      this.controller.test,
    );

    this.router.get(
      "/campaigns",
      AuthMiddleware.authenticate,
      requirePermission("whatsappMarketing.view"),
      this.controller.list,
    );
    this.router.post(
      "/campaigns",
      AuthMiddleware.authenticate,
      requirePermission("whatsappMarketing.create"),
      this.controller.create,
    );
    this.router.get(
      "/campaigns/:id",
      AuthMiddleware.authenticate,
      requirePermission("whatsappMarketing.view"),
      this.controller.getOne,
    );
    this.router.patch(
      "/campaigns/:id",
      AuthMiddleware.authenticate,
      requirePermission("whatsappMarketing.edit"),
      this.controller.update,
    );
    this.router.delete(
      "/campaigns/:id",
      AuthMiddleware.authenticate,
      requirePermission("whatsappMarketing.delete"),
      this.controller.remove,
    );
    this.router.post(
      "/campaigns/:id/send",
      AuthMiddleware.authenticate,
      requirePermission("whatsappMarketing.send"),
      this.controller.send,
    );
    this.router.post(
      "/campaigns/:id/schedule",
      AuthMiddleware.authenticate,
      requirePermission("whatsappMarketing.send"),
      this.controller.schedule,
    );
    this.router.post(
      "/campaigns/:id/pause",
      AuthMiddleware.authenticate,
      requirePermission("whatsappMarketing.edit"),
      this.controller.pause,
    );
    this.router.post(
      "/campaigns/:id/cancel",
      AuthMiddleware.authenticate,
      requirePermission("whatsappMarketing.edit"),
      this.controller.cancel,
    );
    this.router.post(
      "/campaigns/:id/resend",
      AuthMiddleware.authenticate,
      requirePermission("whatsappMarketing.send"),
      this.controller.resend,
    );
    this.router.post(
      "/campaigns/:id/test",
      AuthMiddleware.authenticate,
      requirePermission("whatsappMarketing.send"),
      this.controller.test,
    );
    this.router.get(
      "/campaigns/:id/analytics",
      AuthMiddleware.authenticate,
      requirePermission("whatsappMarketing.view"),
      this.controller.analytics,
    );
    this.router.get(
      "/campaigns/:id/recipients",
      AuthMiddleware.authenticate,
      requirePermission("whatsappMarketing.view"),
      this.controller.recipients,
    );

    this.router.get(
      "/optin",
      AuthMiddleware.authenticate,
      requirePermission("whatsapp.view"),
      this.controller.getOptIn,
    );
    this.router.put(
      "/optin",
      AuthMiddleware.authenticate,
      requirePermission("whatsapp.edit"),
      this.controller.updateOptIn,
    );
  }

  getRouter() {
    return this.router;
  }
}
