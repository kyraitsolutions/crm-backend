import { NextFunction, Request, Response } from "express";
import { RbacService } from "../services/rbac.service";
import httpResponse from "../utils/http.response";
import { UpdateRoleDto } from "../dtos/rbac.dto";

export class RoleController {
  constructor(private rbacService: RbacService) {}

  // ROLES RELATED CONTROLLERS
  createCustomRole = async (req: Request, res: Response) => {
    try {
      const { roleName, permissions } = req.body;
      const organizationId = req.user?.organizationId; // from auth middleware

      if (!roleName && !permissions?.length) {
        return res.status(400).json({
          success: false,
          message: "roleName and permissions are required",
        });
      }

      const role = await this.rbacService.createCustomRole({
        roleName,
        permissions,
        organizationId: organizationId as string,
      });

      return httpResponse(req, res, 201, "Role created successfully", {
        doc: role,
      });
    } catch (error) {
      throw error;
    }
  };

  getRoles = async (req: Request, res: Response) => {
    try {
      const user = req.user;
      const { organization_id } = req.query;
      const currentRole = user?.role;

      const orgId = organization_id ? organization_id : user?.organizationId;

      const roles = await this.rbacService.getRolesByOrganization(
        orgId as string,
        currentRole,
      );

      return httpResponse(req, res, 200, "Roles fetched successfully", {
        docs: roles,
      });
    } catch (error) {
      throw error;
    }
  };

  updateRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { roleId } = req.params;
      const { roleName, permissions } = req.body;
      const organizationId = req.user?.organizationId; // from auth middleware
      const updateRoleDataPayload = {
        roleId,
        name: roleName,
        permissions,
        organizationId: organizationId as string,
      };

      const updateRoleDataPayloadDto = new UpdateRoleDto(updateRoleDataPayload);

      const role = await this.rbacService.updateRole(
        roleId,
        updateRoleDataPayloadDto,
      );

      httpResponse(req, res, 200, "Role updated successfully", {
        docs: role,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { roleId } = req.params;
      await this.rbacService.deleteRole(roleId);
      httpResponse(req, res, 200, "Role deleted successfully", {
        docs: {
          roleId,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // PERMISSIONS RELATED CONTROLLERS
  getRolePermissions = async (req: Request, res: Response) => {
    try {
      const { roleId } = req.params;
      const permissions = await this.rbacService.getPermissionsByRole(roleId);

      return httpResponse(req, res, 200, "Permissions fetched successfully", {
        docs: permissions,
      });
    } catch (error) {
      throw error;
    }
  };
}
