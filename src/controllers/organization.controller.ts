import { NextFunction, Request, Response } from "express";
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

      const organization =
        await organizationOnboardingService.createOrganization(
          createOrganizationPayloadDto,
        );

      httpResponse(req, res, 201, "Client onbaorded successfully", {
        docs: organization,
      });
    } catch (error) {
      next(error);
    }
  };

  getOrganizationDetails = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const user = req.user as any;
      const { organizationId } = req.query;

      const orgId =
        (organizationId as string) || (user?.organizationId as string);

      const organization =
        await organizationService.getOrganizationDetailsByOrganizationId(orgId);
      httpResponse(req, res, 200, "Organization details fetched successfully", {
        docs: organization,
      });
    } catch (error) {
      next(error);
    }
  };
}
