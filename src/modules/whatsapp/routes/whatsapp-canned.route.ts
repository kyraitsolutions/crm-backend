import { Router } from "express";
import { AuthMiddleware } from "../../../middleware/auth.middleware.js";
import { WhatsAppCannedMessageController } from "../canned/controllers/whatsapp-canned-message.controller.js";

export class WhatsappCannedMessageRouter {
  public router = Router({ mergeParams: true });
  private controller = new WhatsAppCannedMessageController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get("/", AuthMiddleware.authenticate, this.controller.list);
    this.router.get(
      "/published",
      AuthMiddleware.authenticate,
      this.controller.listPublished,
    );
    this.router.post("/", AuthMiddleware.authenticate, this.controller.create);
    this.router.put("/:id", AuthMiddleware.authenticate, this.controller.update);
    this.router.delete("/:id", AuthMiddleware.authenticate, this.controller.remove);
    this.router.post(
      "/:id/favourite",
      AuthMiddleware.authenticate,
      this.controller.toggleFavourite,
    );
    this.router.post(
      "/:id/use",
      AuthMiddleware.authenticate,
      this.controller.markUsed,
    );
  }

  getRouter() {
    return this.router;
  }
}
