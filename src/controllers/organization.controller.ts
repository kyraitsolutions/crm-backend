import { NextFunction, Request, Response } from "express";
import { CreateOrganizationDto } from "../dtos/organization.dto";
import { UserService } from "../services";
import { AccountService } from "../services/account.service";
import { OrganizationService } from "../services/organization.service";
import { generateSlug } from "../utils";
import httpResponse from "../utils/http.response";

export class OrganizationController {
  private userService: UserService;
  private accountService: AccountService;
  private organizationService: OrganizationService;
  constructor() {
    this.userService = new UserService();
    this.accountService = new AccountService();
    this.organizationService = new OrganizationService();
  }

  createOrganizationOnboarding = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const user = req.user;

      const { email, companyName } = req.body;

      const organizationDataPayload = {
        ...req.body,
        slug: generateSlug(companyName),
        createdBy: user?.id,
        email: email || user?.email,
        name: companyName,
      };

      const createOrganizationPayloadDto = new CreateOrganizationDto(
        organizationDataPayload,
      );

      console.log(createOrganizationPayloadDto);

      const isOrganzitionExist =
        await this.organizationService.isOrganizationExists(user?.id as string);

      let orgId = null;

      if (isOrganzitionExist) {
        throw new Error("Organization already exists");
      }

      if (!isOrganzitionExist) {
        const organization = await this.organizationService.createOrganization(
          createOrganizationPayloadDto,
        );
        orgId = organization?._id;
        const organizationMemberDataPayload = {
          userId: user?.id as string,
          organizationId: organization?._id as string,
          role: "ADMIN",
        };
        await this.organizationService.createOrganizationMember(
          organizationMemberDataPayload,
        );
        await this.userService.updateUser(user?.id as string, {
          onboarding: true,
        });
        await this.accountService.createAccount(
          user?.id as string,
          orgId as string,
          {
            accountName: companyName,
            email: email || user?.email,
          },
        );
      }

      httpResponse(req, res, 201, "Client onbaorded successfully", {
        docs: {
          orgId,
          onborading: "success",
        },
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
        await this.organizationService.getOrganizationDetailsByOrganizationId(
          orgId,
        );
      httpResponse(req, res, 200, "Organization details fetched successfully", {
        docs: organization,
      });
    } catch (error) {
      next(error);
    }
  };
}
