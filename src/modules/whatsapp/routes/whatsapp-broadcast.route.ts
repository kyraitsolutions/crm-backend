import { Router } from "express";
import { AuthMiddleware } from "../../../middleware/auth.middleware.js";
import { WhatsAppBroadcastController } from "../broadcast/controllers/whatsapp-broadcast.controller.js";

export class WhatsappBroadcastRouter {
  public router = Router({ mergeParams: true });
  private controller = new WhatsAppBroadcastController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get("/context", AuthMiddleware.authenticate, this.controller.context);
    this.router.get("/overview", AuthMiddleware.authenticate, this.controller.overview);
    this.router.get("/templates", AuthMiddleware.authenticate, this.controller.templates);
    this.router.post(
      "/audiences/preview",
      AuthMiddleware.authenticate,
      this.controller.previewAudience,
    );
    this.router.post("/test", AuthMiddleware.authenticate, this.controller.test);

    this.router.get("/campaigns", AuthMiddleware.authenticate, this.controller.list);
    this.router.post("/campaigns", AuthMiddleware.authenticate, this.controller.create);
    this.router.get("/campaigns/:id", AuthMiddleware.authenticate, this.controller.getOne);
    this.router.patch("/campaigns/:id", AuthMiddleware.authenticate, this.controller.update);
    this.router.delete("/campaigns/:id", AuthMiddleware.authenticate, this.controller.remove);
    this.router.post("/campaigns/:id/send", AuthMiddleware.authenticate, this.controller.send);
    this.router.post(
      "/campaigns/:id/schedule",
      AuthMiddleware.authenticate,
      this.controller.schedule,
    );
    this.router.post("/campaigns/:id/pause", AuthMiddleware.authenticate, this.controller.pause);
    this.router.post(
      "/campaigns/:id/cancel",
      AuthMiddleware.authenticate,
      this.controller.cancel,
    );
    this.router.post(
      "/campaigns/:id/resend",
      AuthMiddleware.authenticate,
      this.controller.resend,
    );
    this.router.post("/campaigns/:id/test", AuthMiddleware.authenticate, this.controller.test);
    this.router.get(
      "/campaigns/:id/analytics",
      AuthMiddleware.authenticate,
      this.controller.analytics,
    );
    this.router.get(
      "/campaigns/:id/recipients",
      AuthMiddleware.authenticate,
      this.controller.recipients,
    );

    this.router.get("/optin", AuthMiddleware.authenticate, this.controller.getOptIn);
    this.router.put("/optin", AuthMiddleware.authenticate, this.controller.updateOptIn);
  }

  getRouter() {
    return this.router;
  }
}
