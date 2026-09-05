import { NextFunction, Request, Response } from "express";
import { handleRouteError } from "../utils/asyncHandler.js";
import {
  organizationOnboardingService,
  organizationService,
} from "../container.js";
import { CreateOrganizationDto } from "../dtos/organization.dto.js";
import httpResponse from "../utils/http.response.js";
import { generateSlug } from "../utils/typography.js";

export class OrganizationController {
  createOrganizationOnboarding = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const user = req.user;

      const organizationDataPayload = {
        ...req.body,
        slug: generateSlug(req.body.name as string),
        createdBy: user?.id,
      };

      const createOrganizationPayloadDto = new CreateOrganizationDto(
        organizationDataPayload,
      );

      const result = await organizationOnboardingService.createOrganization(
        createOrganizationPayloadDto,
      );

      httpResponse(req, res, 201, "Client onbaorded successfully", result);
    } catch (error) {
      handleRouteError("OrganizationController", error, next, req);
    }
  };

  getOrganizationDetails = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      // const user = req.user as any;
      const { organizationId } = req.params;

      const orgId = organizationId as string;

      const result =
        await organizationService.getOrganizationDetailsByOrganizationId(orgId);
      httpResponse(
        req,
        res,
        200,
        "Organization details fetched successfully",
        result,
      );
    } catch (error) {
      handleRouteError("OrganizationController", error, next, req);
    }
  };
  updateOrganizationDetails = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      // const user = req.user as any;
      const { organizationId } = req.params;
      const payload = req.body;
      console.log(payload)
      
      const updateDto=new CreateOrganizationDto(payload)
      console.log("sdfsdfs",updateDto)

      const orgId = organizationId as string;
      console.log(orgId)

      const result =await organizationService.update(orgId,updateDto);
      httpResponse(req,res,200,"Organization details fetched successfully",{
        doc:result,
      }
      );
    } catch (error) {
      handleRouteError("OrganizationController", error, next, req);
    }
  };
}


