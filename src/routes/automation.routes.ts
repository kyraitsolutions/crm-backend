import { Router } from "express";
import { AuthMiddleware } from "../middleware/index.js";
import AutomationController from "../controllers/automation.controller";

export class AutomationRouter {
  public router: Router;
  private automationController = new AutomationController();
  constructor() {
    this.router = Router();
    this.automationController = new AutomationController();
    this.initializeRoutes();
  }
  private initializeRoutes(): void {
    // get All chatbot for user
    this.router.post(
      "/:accountId",
      AuthMiddleware.authenticate,
      this.automationController.createAutomation.bind(
        this.automationController,
      ),
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}
