import { Router } from "express";
import { AuthMiddleware } from "../../../middleware/auth.middleware.js";
import { requirePermission } from "../../../middleware/authorization.middleware.js";
import { MetaIntegrationController } from "../controllers/integration.meta.controller.js";

export class MetaIntegrationRouter {
  public router: Router;
  private controller = new MetaIntegrationController();

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    const metaView = ["facebook.view", "instagram.view"] as const;
    const metaEdit = ["facebook.edit", "instagram.edit"] as const;

    this.router.post(
      "/auth/connect",
      AuthMiddleware.authenticate,
      requirePermission([...metaEdit]),
      this.controller.connect.bind(this.controller),
    );

    this.router.get(
      "/auth/callback",
      this.controller.callback.bind(this.controller),
    );

    this.router.post(
      "/auth/disconnect",
      AuthMiddleware.authenticate,
      requirePermission([...metaEdit]),
      this.controller.disconnect.bind(this.controller),
    );

    this.router.get(
      "/:accountId/posts",
      AuthMiddleware.authenticate,
      requirePermission([...metaView]),
      this.controller.getPosts.bind(this.controller),
    );

    this.router.get(
      "/:accountId/lead-forms",
      AuthMiddleware.authenticate,
      requirePermission([...metaView]),
      this.controller.getLeadForms.bind(this.controller),
    );

    this.router.get(
      "/:accountId/leads",
      AuthMiddleware.authenticate,
      requirePermission([...metaView]),
      this.controller.getLeads.bind(this.controller),
    );

    this.router.get(
      "/:accountId/insights",
      AuthMiddleware.authenticate,
      requirePermission([...metaView]),
      this.controller.getInsights.bind(this.controller),
    );

    this.router.post(
      "/:accountId/active-page",
      AuthMiddleware.authenticate,
      requirePermission([...metaEdit]),
      this.controller.setActivePage.bind(this.controller),
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}
