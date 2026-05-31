import { Router } from "express";
import { ConfigurationController } from "../controllers/configuration.controller";
import { AuthMiddleware } from "../middleware";

export class ConfigurationRouter {
  public router: Router;
  private configurationController: ConfigurationController;
  constructor() {
    this.router = Router();
    this.configurationController = new ConfigurationController();
    this.initializeRoutes();
  }
  private initializeRoutes(): void {
    // get configurations by organization Id with filters
    this.router.get(
      "/",
      AuthMiddleware.authenticate,
      this.configurationController.getConfigurations.bind(
        this.configurationController,
      ),
    );

    // create configuration item
    this.router.post(
      "/:configId",
      AuthMiddleware.authenticate,
      this.configurationController.createConfigItem.bind(
        this.configurationController,
      ),
    );

    // update configuration by id
    this.router.put(
      "/:id",
      AuthMiddleware.authenticate,
      this.configurationController.updateConfigItem.bind(
        this.configurationController,
      ),
    );

    // delete configuration Item by id
    this.router.delete(
      "/:configId/:itemId",
      AuthMiddleware.authenticate,
      this.configurationController.deleteConfigItem.bind(
        this.configurationController,
      ),
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}
