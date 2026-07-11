import { Router } from "express";
import { WhatsappAuthController } from "../auth/controllers/whatsapp-auth.controller.js";
import { AuthMiddleware } from "../../../middleware/auth.middleware.js";

export class WhatsappAuthRouter {
  public router: Router;
  private whatsappAuthController: WhatsappAuthController;

  constructor() {
    this.router = Router();
    this.whatsappAuthController = new WhatsappAuthController();

    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.post(
      "/connect",
      AuthMiddleware.authenticate,
      this.whatsappAuthController.connectWhatsapp.bind(this.whatsappAuthController)
    );

    this.router.get(
      "/callback",
      this.whatsappAuthController.callback.bind(this.whatsappAuthController)
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}