import { Router } from "express";
import { AuthMiddleware } from "../../../middleware/auth.middleware.js";
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
    this.router.post(
      "/",
      AuthMiddleware.authenticate,
      this.controller.createTemplate.bind(this.controller),
    );
  }

  getRouter() {
    return this.router;
  }
}
