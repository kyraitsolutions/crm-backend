import { Router } from "express";
import { OrganizationController } from "../controllers/organization.controller.js";
import { AuthMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/authorization.middleware.js";

export class OrganizationRouter {
  public router: Router;
  private organizationController: OrganizationController;
  constructor() {
    this.router = Router();
    this.organizationController = new OrganizationController();
    this.initializeRoutes();
  }
  private initializeRoutes(): void {
    this.router.post(
      "/onboarding",
      AuthMiddleware.authenticate,
      this.organizationController.createOrganizationOnboarding.bind(
        this.organizationController,
      ),
    );

    this.router.get(
      "/:organizationId",
      AuthMiddleware.authenticate,
      requirePermission("organization.view"),
      this.organizationController.getOrganizationDetails.bind(
        this.organizationController,
      ),
    );
    this.router.post(
      "/:organizationId",
      AuthMiddleware.authenticate,
      requirePermission("organization.edit"),
      this.organizationController.updateOrganizationDetails.bind(
        this.organizationController,
      ),
    );
  }
  public getRouter(): Router {
    return this.router;
  }
}
