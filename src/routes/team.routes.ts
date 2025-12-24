import { Router } from "express";
import { TeamController } from "../controllers/team.controller.js";
import { AuthMiddleware } from "../middleware/index.js";

export class TeamRouter {
    public router: Router;
    private teamController: TeamController;
    constructor() {
        this.router = Router();
        this.teamController = new TeamController();
        this.initializeRoutes();
    }
    private initializeRoutes(): void {
        
        this.router.get('/',AuthMiddleware.authenticate, this.teamController.getTeamMembers.bind(this.teamController));
        this.router.get('/:id',AuthMiddleware.authenticate, this.teamController.getTeamMemberById.bind(this.teamController));
        this.router.post('/',AuthMiddleware.authenticate, this.teamController.createTeamMember.bind(this.teamController));
        this.router.put('/:id',AuthMiddleware.authenticate, this.teamController.updateTeamMember.bind(this.teamController));
        this.router.delete('/:id',AuthMiddleware.authenticate, this.teamController.deleteTeamMember.bind(this.teamController));

        // assign account to team member
        this.router.post('/:id/assign-account',AuthMiddleware.authenticate, this.teamController.assignAccountToTeamMember.bind(this.teamController));
        // this.router.post('/:id/assign-account/:accountId/lead/:leadId',AuthMiddleware.authenticate, this.teamController.assignLeadToTeamMember.bind(this.teamController));
    }
    public getRouter(): Router {
        return this.router;
    }
}