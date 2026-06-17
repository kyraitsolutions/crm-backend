import { Router } from "express";
import { OrganizationController } from "../controllers/organization.controller.js";
import { AuthMiddleware } from "../middleware/auth.middleware.js";

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
      this.organizationController.getOrganizationDetails.bind(
        this.organizationController,
      ),
    );
  }
  public getRouter(): Router {
    return this.router;
  }
}
