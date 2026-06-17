import { Router } from "express";
import { AuthMiddleware } from "../../../middleware";
import { WhatsAppController } from "../controllers/whatsapp.controller";

export class WhatsappRouter {
  public router: Router;
  private whatsappController = new WhatsAppController();

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(
      "/phone-number/register",
      AuthMiddleware.authenticate,
      this.whatsappController.registerPhoneNumber.bind(this.whatsappController),
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}
