import { Router } from "express";
import { TeamController } from "../controllers/team.controller";

export class TeamRouter {
    public router: Router;
    private teamController: TeamController;
    constructor() {
        this.router = Router();
        this.teamController = new TeamController();
        this.initializeRoutes();
    }
    private initializeRoutes(): void {
        this.router.get('/', this.teamController.getTeamMembers.bind(this.teamController));
        this.router.get('/:id', this.teamController.getTeamMemberById.bind(this.teamController));
        this.router.post('/', this.teamController.createTeamMember.bind(this.teamController));
        this.router.put('/:id', this.teamController.updateTeamMember.bind(this.teamController));
        this.router.delete('/:id', this.teamController.deleteTeamMember.bind(this.teamController));
    }
    public getRouter(): Router {
        return this.router;
    }
}