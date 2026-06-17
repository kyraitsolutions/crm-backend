import { Router } from "express";
import { RoleController } from "../controllers/rbac.controller.js";
import { requirePermission } from "../middleware/authorization.middleware.js";
import { rbacService } from "../container.js";
import { AuthMiddleware } from "../middleware/auth.middleware.js";

export class RBACRouter {
  public router: Router;

  private roleController: RoleController;

  constructor() {
    this.router = Router();

    // ✅ Dependency Injection
    this.roleController = new RoleController(rbacService);

    this.initializeRoutes();
  }

  private initializeRoutes() {
    // ROLE RELATED ROUTES
    this.router.get(
      "/",
      AuthMiddleware.authenticate,
      this.roleController.getRoles,
    );
    this.router.post(
      "/",
      AuthMiddleware.authenticate,
      requirePermission("role.create"),
      this.roleController.createCustomRole,
    );

    this.router.put(
      "/:roleId",
      AuthMiddleware.authenticate,
      requirePermission("role.update"),
      this.roleController.updateRole,
    );

    this.router.delete(
      "/:roleId",
      AuthMiddleware.authenticate,
      requirePermission("role.delete"),
      this.roleController.deleteRole,
    );

    // PERMISSIONS RELATED ROUTES
    this.router.get(
      "/:roleId/permissions",
      this.roleController.getRolePermissions,
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}
