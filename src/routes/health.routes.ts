import { Router } from "express";
import { HealthController } from "../controllers/health.controller.js";

export class HealthRouter {
  public router: Router;
  private healthController: HealthController;

  constructor() {
    this.router = Router();
    this.healthController = new HealthController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.get("/check",
      this.healthController.checkHealth.bind(this.healthController)
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}
