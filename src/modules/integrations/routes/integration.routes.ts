import { Router } from "express";
import { AuthMiddleware } from "../../../middleware";
import { IntegrationController } from "../controllers/integration.controller";

export class IntegrationRouter {
  public router: Router;
  private integrationController = new IntegrationController();

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(
      "/whatsapp/connect",
      AuthMiddleware.authenticate,
      this.integrationController.connectWhatsApp.bind(
        this.integrationController,
      ),
    );

    this.router.get(
      "/whatsapp/callback",
      this.integrationController.whatsappCallback.bind(
        this.integrationController,
      ),
    );

    this.router.get(
      "/:accountId/:provider",
      AuthMiddleware.authenticate,
      this.integrationController.getIntegration.bind(
        this.integrationController,
      ),
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}
