import { Router } from "express";
import { AuthMiddleware } from "../middleware/auth.middleware.js";
import { NotificationController } from "../controllers/notification.controller.js";
import { NotificationSettingsController } from "../controllers/notification-settings.controller.js";

export class NotificationRouter {
  public router: Router;
  private notificationController: NotificationController;
  private settingsController: NotificationSettingsController;

  constructor() {
    this.router = Router();
    this.notificationController = new NotificationController();
    this.settingsController = new NotificationSettingsController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    const auth = AuthMiddleware.authenticate;

    // Settings / preferences (must be before /:organizationId)
    this.router.get(
      "/catalog",
      auth,
      this.settingsController.getCatalog.bind(this.settingsController),
    );
    this.router.get(
      "/settings",
      auth,
      this.settingsController.getSettings.bind(this.settingsController),
    );
    this.router.put(
      "/settings",
      auth,
      this.settingsController.updateSettings.bind(this.settingsController),
    );
    this.router.get(
      "/preferences",
      auth,
      this.settingsController.getPreferences.bind(this.settingsController),
    );
    this.router.put(
      "/preferences",
      auth,
      this.settingsController.updatePreferences.bind(this.settingsController),
    );
    this.router.post(
      "/preset",
      auth,
      this.settingsController.applyPreset.bind(this.settingsController),
    );
    this.router.post(
      "/test",
      auth,
      this.settingsController.sendTest.bind(this.settingsController),
    );
    this.router.get(
      "/workspace-policy",
      auth,
      this.settingsController.getWorkspacePolicy.bind(this.settingsController),
    );
    this.router.put(
      "/workspace-policy",
      auth,
      this.settingsController.updateWorkspacePolicy.bind(
        this.settingsController,
      ),
    );
    this.router.get(
      "/deliveries/debug",
      auth,
      this.settingsController.getDeliveryDebug.bind(this.settingsController),
    );
    this.router.post(
      "/migrate-legacy",
      auth,
      this.settingsController.migrateLegacy.bind(this.settingsController),
    );
    this.router.get(
      "/mutes",
      auth,
      this.settingsController.listMutes.bind(this.settingsController),
    );
    this.router.post(
      "/mute",
      auth,
      this.settingsController.mute.bind(this.settingsController),
    );
    this.router.delete(
      "/mute",
      auth,
      this.settingsController.unmute.bind(this.settingsController),
    );
    this.router.get(
      "/staff-alerts",
      auth,
      this.settingsController.getStaffAlerts.bind(this.settingsController),
    );
    this.router.put(
      "/staff-alerts",
      auth,
      this.settingsController.updateStaffAlerts.bind(this.settingsController),
    );

    // Inbox
    this.router.get(
      "/",
      auth,
      this.notificationController.getNotifications.bind(
        this.notificationController,
      ),
    );

    this.router.post(
      "/read-all",
      auth,
      this.notificationController.markAllAsRead.bind(
        this.notificationController,
      ),
    );

    this.router.patch(
      "/:notificationId/read",
      auth,
      this.notificationController.markAsRead.bind(this.notificationController),
    );

    this.router.get(
      "/:organizationId",
      auth,
      this.notificationController.getNotifications.bind(
        this.notificationController,
      ),
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}
