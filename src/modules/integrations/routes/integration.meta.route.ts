import { Router } from "express";
import { AuthMiddleware } from "../../../middleware/auth.middleware.js";
import { MetaIntegrationController } from "../controllers/integration.meta.controller.js";

export class MetaIntegrationRouter {
  public router: Router;
  private controller = new MetaIntegrationController();

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes() {

    this.router.post(
      "/auth/connect",
      AuthMiddleware.authenticate,
      this.controller.connect.bind(this.controller),
    );

    this.router.get(
      "/auth/callback",
      this.controller.callback.bind(this.controller),
    );

    this.router.post(
      "/auth/disconnect",
      AuthMiddleware.authenticate,
      this.controller.disconnect.bind(this.controller),
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}
