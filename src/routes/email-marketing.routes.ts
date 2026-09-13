import { Router } from "express";
import { EmailMarketingController } from "../controllers/email-marketing.controller.js";
import { EmailTrackingController } from "../controllers/email-tracking.controller.js";
import { AuthMiddleware } from "../middleware/auth.middleware.js";

export class EmailMarketingRouter {
  public router: Router;
  private controller = new EmailMarketingController();
  private tracking = new EmailTrackingController();

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(
      "/webhooks/ses",
      this.controller.sesWebhook.bind(this.controller),
    );

    this.router.get(
      "/:accountId/overview",
      AuthMiddleware.authenticate,
      this.controller.overview.bind(this.controller),
    );
    this.router.get(
      "/:accountId/campaigns",
      AuthMiddleware.authenticate,
      this.controller.list.bind(this.controller),
    );
    this.router.post(
      "/:accountId/campaigns",
      AuthMiddleware.authenticate,
      this.controller.create.bind(this.controller),
    );
    this.router.get(
      "/:accountId/campaigns/:id",
      AuthMiddleware.authenticate,
      this.controller.getOne.bind(this.controller),
    );
    this.router.patch(
      "/:accountId/campaigns/:id",
      AuthMiddleware.authenticate,
      this.controller.update.bind(this.controller),
    );
    this.router.delete(
      "/:accountId/campaigns/:id",
      AuthMiddleware.authenticate,
      this.controller.remove.bind(this.controller),
    );
    this.router.post(
      "/:accountId/campaigns/:id/send",
      AuthMiddleware.authenticate,
      this.controller.send.bind(this.controller),
    );
    this.router.post(
      "/:accountId/campaigns/:id/schedule",
      AuthMiddleware.authenticate,
      this.controller.schedule.bind(this.controller),
    );
    this.router.post(
      "/:accountId/campaigns/:id/pause",
      AuthMiddleware.authenticate,
      this.controller.pause.bind(this.controller),
    );
    this.router.post(
      "/:accountId/campaigns/:id/cancel",
      AuthMiddleware.authenticate,
      this.controller.cancel.bind(this.controller),
    );
    this.router.post(
      "/:accountId/campaigns/:id/test",
      AuthMiddleware.authenticate,
      this.controller.test.bind(this.controller),
    );
    this.router.get(
      "/:accountId/campaigns/:id/analytics",
      AuthMiddleware.authenticate,
      this.controller.analytics.bind(this.controller),
    );
    this.router.get(
      "/:accountId/campaigns/:id/recipients",
      AuthMiddleware.authenticate,
      this.controller.recipients.bind(this.controller),
    );
    this.router.post(
      "/:accountId/audiences/preview",
      AuthMiddleware.authenticate,
      this.controller.previewAudience.bind(this.controller),
    );
    this.router.get(
      "/:accountId/templates",
      AuthMiddleware.authenticate,
      this.controller.templates.bind(this.controller),
    );
    this.router.post(
      "/:accountId/templates",
      AuthMiddleware.authenticate,
      this.controller.createTemplate.bind(this.controller),
    );
    this.router.patch(
      "/:accountId/templates/:templateId",
      AuthMiddleware.authenticate,
      this.controller.updateTemplate.bind(this.controller),
    );
    this.router.delete(
      "/:accountId/templates/:templateId",
      AuthMiddleware.authenticate,
      this.controller.deleteTemplate.bind(this.controller),
    );
    this.router.post(
      "/:accountId/templates/:templateId/duplicate",
      AuthMiddleware.authenticate,
      this.controller.duplicateTemplate.bind(this.controller),
    );
    this.router.get(
      "/:accountId/suppression",
      AuthMiddleware.authenticate,
      this.controller.suppression.bind(this.controller),
    );
    this.router.post(
      "/:accountId/suppression",
      AuthMiddleware.authenticate,
      this.controller.addSuppression.bind(this.controller),
    );
  }

  public getRouter() {
    return this.router;
  }

  public getTrackingRouter() {
    const router = Router();
    router.get("/o/:id", this.tracking.open.bind(this.tracking));
    router.get("/c/:id", this.tracking.click.bind(this.tracking));
    router.get("/u/:id", this.tracking.unsubscribePage.bind(this.tracking));
    router.post("/u/:id", this.tracking.unsubscribePage.bind(this.tracking));
    router.get("/track/open/:token", this.tracking.open.bind(this.tracking));
    router.get("/track/click/:token", this.tracking.click.bind(this.tracking));
    router.get("/unsubscribe/:token", this.tracking.unsubscribePage.bind(this.tracking));
    router.post("/unsubscribe/:token", this.tracking.unsubscribePage.bind(this.tracking));
    return router;
  }
}
