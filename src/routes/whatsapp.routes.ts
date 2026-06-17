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
      "/connect", AuthMiddleware.authenticate,
      this.whatsappController.connectWhatsapp.bind(
        this.whatsappController
      )
    )

    this.router.get(
      "/callback",
      // AuthMiddleware.authenticate,
      this.whatsappController.callback.bind(
        this.whatsappController,
      ),
    );
  }
  public getRouter(): Router {
    return this.router;
  }
}



// router.post('/meta/connect', connectWhatsAppMeta);
// router.get('/meta/callback', metaCallback);
