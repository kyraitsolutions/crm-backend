import { Router } from "express";
import { AuthMiddleware } from "../middleware/auth.middleware.js";
import { WhatsappController } from "../controllers/whatsapp.controller.js";

export class WhatsappRouter {
  public router: Router;
  private whatsappController: WhatsappController;
  constructor() {
    this.router = Router();
    this.whatsappController = new WhatsappController();
    this.initializeRoutes();
  }
  private initializeRoutes(): void {

    this.router.post(
      "/",
      AuthMiddleware.authenticate,
      this.whatsappController.getContacts.bind(
        this.whatsappController,
      ),
    );
  }
  public getRouter(): Router {
    return this.router;
  }
}
