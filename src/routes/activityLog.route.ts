import { Router } from "express";
import ActivityLogController from "../controllers/activityLog.controller.js";
import { AuthMiddleware } from "../middleware/auth.middleware.js";

export class ActivityLogRouter {
  public router: Router;
  private activityLogController = new ActivityLogController();

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(
      "/:accountId",
      AuthMiddleware.authenticate,
      this.activityLogController.getActivityLogs.bind(
        this.activityLogController,
      ),
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}
