import { Router } from "express";
import { AuthMiddleware } from "../middleware/auth.middleware.js";
import { NotificationController } from "../controllers/notification.controller.js";

export class NotificationRouter {
  public router: Router;
  private notificationController: NotificationController;
  constructor() {
    this.router = Router();
    this.notificationController = new NotificationController();
    this.initializeRoutes();
  }
  private initializeRoutes(): void {

    this.router.get(
      "/:organizationId",
      AuthMiddleware.authenticate,
      this.notificationController.getNotifications.bind(
        this.notificationController,
      ),
    );
  }
  public getRouter(): Router {
    return this.router;
  }
}
