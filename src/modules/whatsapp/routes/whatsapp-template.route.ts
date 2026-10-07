import { Router } from "express";
import { AuthMiddleware } from "../../../middleware/auth.middleware.js";
import { requirePermission } from "../../../middleware/authorization.middleware.js";
import { WhatsappTemplateController } from "../templates/controllers/whatsapp-template.controller.js";

export class WhatsappTemplateRouter {
  public router = Router({
    mergeParams: true,
  });
  private controller = new WhatsappTemplateController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // GET ALL TEMPLATES ROUTE
    this.router.get(
      "/",
      AuthMiddleware.authenticate,
      requirePermission("whatsapp.view"),
      this.controller.getTemplates.bind(this.controller),
    );

    // POST CREATE TEMPLATES ROUTE
    this.router.post(
      "/",
      AuthMiddleware.authenticate,
      requirePermission("whatsapp.create"),
      this.controller.createTemplate.bind(this.controller),
    );
  }

  getRouter() {
    return this.router;
  }
}
