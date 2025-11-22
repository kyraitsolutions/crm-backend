import httpResponse from "../utils/http.response";
import { NextFunction } from "express";
import { Request, Response } from "express";
import { TeamService } from "../services/team.service";
import logger from "../utils/logger";


export class TeamController {
    private teamService: TeamService;
    constructor() {
        this.teamService = new TeamService();
    }
    getTeamMembers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const user = req.user as any;
            const teamMembers = await this.teamService.getTeamMembers(user.id);
            httpResponse(req, res, 200, "Team members fetched successfully", {
                docs: teamMembers,
                limit: 10,
                skip: 0,
            });
        } catch (error) {
            logger.error(`Error fetching team members: ${error}`);
            next(error as Error);
        }
    }
    getTeamMemberById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const user = req.user as any;

            // here i need to work tomorrow
            // i need to get the team member by id
            // i need to check if the team member is belongs to the user
            // if the team member is belongs to the user then return the team member
            // if the team member is not belongs to the user then return 403 error
            // if the team member is not found then return 404 error
            // if the team member is found then return the team member
            // if the team member is found then return the team member
            const teamMember = await this.teamService.getTeamMemberById(req.params.id);
            httpResponse(req, res, 200, "Team member fetched successfully", {
                docs: teamMember,
                limit: 10,
                skip: 0,
            });
        } catch (error) {
            logger.error(`Error fetching team member by id: ${error}`);
            next(error as Error);
        }
    }
    createTeamMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            logger.info(`Creating team member: ${req.body}`);
            const user=req.user as any;
            console.log("req.body",user,req.body);
            const teamMember = await this.teamService.createTeamMember(user.id,req.body);
            httpResponse(req, res, 200, "Team member created successfully", {
                docs: teamMember,
                limit: 10,
                skip: 0,
            });
        } catch (error) {
            logger.error(`Error creating team member: ${error}`);
            next(error as Error);
        }
    }
    updateTeamMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const teamMember = await this.teamService.updateTeamMember(req.params.id, req.body);
            httpResponse(req, res, 200, "Team member updated successfully", {
                docs: teamMember,
                limit: 10,
                skip: 0,
            });
        } catch (error) {
            logger.error(`Error updating team member: ${error}`);
            next(error as Error);
        }
    }
    deleteTeamMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const teamMember = await this.teamService.deleteTeamMember(req.params.id);
            httpResponse(req, res, 200, "Team member deleted successfully", {
                docs: teamMember,
                limit: 10,
                skip: 0,
            });
        } catch (error) {
            logger.error(`Error deleting team member: ${error}`);
            next(error as Error);
        }
    }
    assignTaskToMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { memberId, accountId, leadId } = req.body;
            const assignment = await this.teamService.assignTaskToMember(memberId,accountId,leadId);
            httpResponse(req, res, 200, "Task assigned to member successfully", {
                docs: assignment,
                limit: 10,
                skip: 0,
            });
        }
        catch (error) {
            logger.error(`Error assigning task to member: ${error}`);
            next(error as Error);
        }
    }

}