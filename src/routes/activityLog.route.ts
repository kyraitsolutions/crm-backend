import { Router } from "express";
import ActivityLogController from "../controllers/activityLog.controller.js";
import { AuthMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/authorization.middleware.js";

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
      requirePermission("activityLogs.view"),
      this.activityLogController.getActivityLogs.bind(
        this.activityLogController,
      ),
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}
