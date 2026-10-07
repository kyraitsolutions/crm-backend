import { Router } from "express";
import { AuthMiddleware } from "../middleware/index.js";
import { requirePermission } from "../middleware/authorization.middleware.js";
import AutomationController from "../controllers/automation.controller.js";

export class AutomationRouter {
  public router: Router;
  private automationController = new AutomationController();
  constructor() {
    this.router = Router();
    this.automationController = new AutomationController();
    this.initializeRoutes();
  }
  private initializeRoutes(): void {
    this.router.get(
      "/:accountId",
      AuthMiddleware.authenticate,
      requirePermission("configuration.view"),
      this.automationController.getAutomations.bind(this.automationController),
    );

    this.router.post(
      "/:accountId",
      AuthMiddleware.authenticate,
      requirePermission("configuration.edit"),
      this.automationController.createAutomation.bind(
        this.automationController,
      ),
    );

    this.router.put(
      "/:accountId/:automationId",
      AuthMiddleware.authenticate,
      requirePermission("configuration.edit"),
      this.automationController.updateAutomaton.bind(this.automationController),
    );

    this.router.delete(
      "/:accountId/:automationId",
      AuthMiddleware.authenticate,
      requirePermission("configuration.edit"),
      this.automationController.deleteAutomation.bind(
        this.automationController,
      ),
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}
