import { Router } from "express";
import { AuthMiddleware } from "../../../middleware/auth.middleware.js";
import { WhatsAppIntegrationController } from "../controllers/integration.whatsapp.controller.js";

export class WhatsAppIntegrationRouter {
  public router: Router;
  private controller = new WhatsAppIntegrationController();

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // POST CONNECT WHATSAPP
    this.router.post(
      "/connect",
      AuthMiddleware.authenticate,
      this.controller.connect.bind(this.controller),
    );

    // POST DISCONNECT WHATSAPP
    this.router.post(
      "/disconnect",
      AuthMiddleware.authenticate,
      this.controller.disconnect.bind(this.controller),
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}
