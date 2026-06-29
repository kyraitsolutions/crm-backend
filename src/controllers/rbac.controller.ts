import { NextFunction, Request, Response } from "express";
import { RbacService } from "../services/rbac.service.js";
import httpResponse from "../utils/http.response.js";
import { CreateRoleDto, UpdateRoleDto } from "../dtos/rbac.dto.js";
import { TRole } from "../types/roles-permissions.type.js";

export class RoleController {
  constructor(private rbacService: RbacService) {}

  // ROLES RELATED CONTROLLERS
  createCustomRole = async (req: Request, res: Response) => {
    try {
      const bodyPayload = new CreateRoleDto(req.body);
      const organizationId = req.user?.organizationId; // from auth middleware

      const createCustomRolePayload = {
        roleName: bodyPayload.roleName,
        permissions: bodyPayload.permissions,
        organizationId: organizationId as string,
      };

      const result = await this.rbacService.createCustomRole(
        createCustomRolePayload,
      );

      return httpResponse(req, res, 201, "Role created successfully", result);
    } catch (error) {
      throw error;
    }
  };

  getRoles = async (req: Request, res: Response) => {
    try {
      const user = req.user;

      const currentRole = user?.role as TRole;
      const orgId = user?.organizationId;

      const result = await this.rbacService.getRolesByOrganization(
        orgId as string,
        currentRole,
      );

      return httpResponse(req, res, 200, "Roles fetched successfully", result);
    } catch (error) {
      throw error;
    }
  };

  updateRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { roleId } = req.params;
      // const { roleName, permissions } = req.body;
      const { name, permissions } = new UpdateRoleDto(req.body);
      const organizationId = req.user?.organizationId; // from auth middleware

      const updateRoleDataPayload = {
        roleId,
        name,
        permissions,
        organizationId: organizationId as string,
      };

      const result = await this.rbacService.updateRole(
        roleId,
        updateRoleDataPayload,
      );

      httpResponse(req, res, 200, "Role updated successfully", result);
    } catch (error) {
      next(error);
    }
  };

  deleteRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { roleId } = req.params;
      const result = await this.rbacService.deleteRole(roleId);
      httpResponse(req, res, 200, "Role deleted successfully", result);
    } catch (error) {
      next(error);
    }
  };

  // PERMISSIONS RELATED CONTROLLERS
  getRolePermissions = async (req: Request, res: Response) => {
    try {
      const { roleId } = req.params;
      const results = await this.rbacService.getPermissionsByRole(roleId);

      return httpResponse(
        req,
        res,
        200,
        "Permissions fetched successfully",
        results,
      );
    } catch (error) {
      throw error;
    }
  };
}
