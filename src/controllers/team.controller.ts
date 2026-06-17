import httpResponse from "../utils/http.response.js";
import { NextFunction } from "express";
import { Request, Response } from "express";
import { TeamService } from "../services/team.service.js";
import logger from "../utils/logger.js";
import { CreateTeamMemberDto } from "../dtos/team.dto.js";

export class TeamController {
  private teamService: TeamService;
  constructor() {
    this.teamService = new TeamService();
  }

  getTeamMembers = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const user = req.user;
      const teamMembers = await this.teamService.getTeamMembers(
        user?.organizationId as string,
      );

      httpResponse(req, res, 200, "Team members fetched successfully", {
        docs: teamMembers,
        limit: 10,
        skip: 0,
      });
    } catch (error) {
      logger.error(`Error fetching team members: ${error}`);
      next(error as Error);
    }
  };

  getTeamMemberById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const teamMember = await this.teamService.getTeamMemberById(
        req.params.id,
      );
      httpResponse(req, res, 200, "Team member fetched successfully", {
        docs: teamMember,
        limit: 10,
        skip: 0,
      });
    } catch (error) {
      logger.error(`Error fetching team member by id: ${error}`);
      next(error as Error);
    }
  };

  createTeamMember = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const user = req.user;

      const createTeamMemberDto = new CreateTeamMemberDto(req.body);

      const teamMember = await this.teamService.createTeamMember(
        user?.id as string,
        user?.organizationId as string,
        createTeamMemberDto,
      );

      httpResponse(req, res, 200, "Team member created successfully", {
        doc: teamMember,
        limit: 10,
        skip: 0,
      });
    } catch (error) {
      logger.error(`Error creating team member: ${error}`);
      next(error as Error);
    }
  };

  assignAccountToTeamMember = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const user = req.user;
      const { userId } = req.params;
      const { accountIds } = req.body;

      const assignment = await this.teamService.assignAccountToMember(
        userId,
        user?.organizationId as string,
        accountIds,
      );

      httpResponse(req, res, 200, "Task assigned to member successfully", {
        docs: assignment,
        limit: 10,
        skip: 0,
      });
    } catch (error) {
      logger.error(`Error assigning task to member: ${error}`);
      next(error as Error);
    }
  };

  updateTeamMember = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const teamMember = await this.teamService.updateTeamMember(
        req.params.id,
        req.body,
      );
      httpResponse(req, res, 200, "Team member updated successfully", {
        docs: teamMember,
        limit: 10,
        skip: 0,
      });
    } catch (error) {
      logger.error(`Error updating team member: ${error}`);
      next(error as Error);
    }
  };

  deleteTeamMember = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const ids = req.query["teamMembersIds[]"];

      const teamMember = await this.teamService.deleteTeamMember(
        ids as string[],
      );

      httpResponse(req, res, 200, "Team member deleted successfully", {
        docs: teamMember,
        limit: 10,
        skip: 0,
      });
    } catch (error) {
      logger.error(`Error deleting team member: ${error}`);
      next(error as Error);
    }
  };
}
