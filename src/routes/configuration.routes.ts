import { Router } from "express";
import { ConfigurationController } from "../controllers/configuration.controller.js";
import { AuthMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/authorization.middleware.js";

export class ConfigurationRouter {
  public router: Router;
  private configurationController: ConfigurationController;
  constructor() {
    this.router = Router();
    this.configurationController = new ConfigurationController();
    this.initializeRoutes();
  }
  private initializeRoutes(): void {
    this.router.get(
      "/",
      AuthMiddleware.authenticate,
      requirePermission("configuration.view"),
      this.configurationController.getConfigurations.bind(
        this.configurationController,
      ),
    );

    this.router.post(
      "/:configId",
      AuthMiddleware.authenticate,
      requirePermission("configuration.edit"),
      this.configurationController.createConfigItem.bind(
        this.configurationController,
      ),
    );

    this.router.put(
      "/:configId/:itemId",
      AuthMiddleware.authenticate,
      requirePermission("configuration.edit"),
      this.configurationController.updateConfigItem.bind(
        this.configurationController,
      ),
    );

    this.router.delete(
      "/:configId/:itemId",
      AuthMiddleware.authenticate,
      requirePermission("configuration.edit"),
      this.configurationController.deleteConfigItem.bind(
        this.configurationController,
      ),
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}
