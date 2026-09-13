import httpResponse from "../utils/http.response.js";
import { NextFunction } from "express";
import { handleRouteError } from "../utils/asyncHandler.js";
import { Request, Response } from "express";
import { TeamService } from "../services/team.service.js";
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
      const result = await this.teamService.getTeamMembers(
        String(user?.organizationId),
      );

      httpResponse(req, res, 200, "Team members fetched successfully", result);
    } catch (error) {
      handleRouteError("TeamController", error, next, req);
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
      handleRouteError("TeamController", error, next, req);
    }
  };

  createTeamMember = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      // const user = req.user;
      const createTeamMemberDto = new CreateTeamMemberDto(req.body);

      const context = {
        // accountId: String(accountId),
        organizationId: String(req?.user?.organizationId),
        userId: String(req?.user?.id),
        userName: String(req?.user?.name),
      };

      const result = await this.teamService.createTeamMember(
        context,
        createTeamMemberDto,
      );

      httpResponse(req, res, 200, "Team member created successfully", result);
    } catch (error) {
      handleRouteError("TeamController", error, next, req);
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
      handleRouteError("TeamController", error, next, req);
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
      handleRouteError("TeamController", error, next, req);
    }
  };

  deleteTeamMember = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const ids = req.query["teamMembersIds[]"];
      const orgId = req.user?.organizationId;

      const allIds = Array.isArray(ids) ? ids : [ids];

      const result = await this.teamService.deleteTeamMembers(
        String(orgId),
        allIds as string[],
      );

      httpResponse(req, res, 200, "Team member deleted successfully", result);
    } catch (error) {
      handleRouteError("TeamController", error, next, req);
    }
  };
}
