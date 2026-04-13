import { Router } from "express";
import { TeamController } from "../controllers/team.controller.js";
import { AuthMiddleware } from "../middleware/index.js";
import { requirePermission } from "../middleware/authorization.middleware.js";

export class TeamRouter {
  public router: Router;
  private teamController: TeamController;
  constructor() {
    this.router = Router();
    this.teamController = new TeamController();
    this.initializeRoutes();
  }
  private initializeRoutes(): void {
    this.router.get(
      "/",
      AuthMiddleware.authenticate,
      this.teamController.getTeamMembers.bind(this.teamController),
    );
    this.router.get(
      "/:id",
      AuthMiddleware.authenticate,
      this.teamController.getTeamMemberById.bind(this.teamController),
    );
    this.router.post(
      "/",
      AuthMiddleware.authenticate,
      requirePermission("teams.create", true),
      this.teamController.createTeamMember.bind(this.teamController),
    );
    // assign account to team member
    this.router.post(
      "/:userId/assign-account",
      AuthMiddleware.authenticate,
      this.teamController.assignAccountToTeamMember.bind(this.teamController),
    );
    this.router.put(
      "/:id",
      AuthMiddleware.authenticate,
      requirePermission("teams.update", true),
      this.teamController.updateTeamMember.bind(this.teamController),
    );
    this.router.delete(
      "/",
      AuthMiddleware.authenticate,
      requirePermission("teams.delete"),
      this.teamController.deleteTeamMember.bind(this.teamController),
    );
  }
  public getRouter(): Router {
    return this.router;
  }
}
