import mongoose from "mongoose";
import { ROLES } from "../config/permissions.js";
import { DASHBOARD_URL_PATH } from "../constants/path.js";
import {
  CreateOrganizationDto,
  CreateOrganizationResponseDto,
} from "../dtos/organization.dto.js";
import { AccountService } from "./account.service.js";
import { ConfigBootstrapService } from "./configBootstrap.service.js";
import { EmailService } from "./email.service.js";
import { OrganizationService } from "./organization.service.js";
import { RbacService } from "./rbac.service.js";
import { UserService } from "./user.service.js";
import { UserProfileService } from "./userprofile.service.js";
import { TApiResponse } from "../types/api-response.type.js";

export class OrganizationOnboardingService {
  constructor(
    private organizationService: OrganizationService,
    private userService: UserService,
    private userProfileService: UserProfileService,
    private accountService: AccountService,
    private rbacService: RbacService,
    private configBootstrapService: ConfigBootstrapService,
    private emailService: EmailService,
  ) {}

  async createOrganization(
    data: CreateOrganizationDto,
  ): Promise<TApiResponse<CreateOrganizationResponseDto>> {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      // check if organization already exists
      const organizationExists =
        await this.organizationService.isOrganizationExists(data.createdBy);

      if (organizationExists) throw new Error("Organization already exists");

      // create organization
      const organization = await this.organizationService.create(data, session);

      // create default roles
      const roles = await this.rbacService.createDefaultRolesAndPermissions(
        String(organization?.id),
        session,
      );

      // create organization member
      const adminRoleId = roles.find(
        (r: { name: string }) => r.name === ROLES.OWNER,
      );
      await this.organizationService.createOrganizationMember(
        {
          userId: data.createdBy,
          organizationId: organization?.id,
          roleId: adminRoleId?.id,
        },
        session,
      );

      // create account
      await this.accountService.createAccount(
        data.createdBy,
        String(organization?.id),
        { accountName: data.name, email: data.email??"" },
        session,
      );

      // update the user onboarding status
      await this.userService.updateUser(
        data.createdBy,
        { onboarding: true },
        session,
      );

      // update user profile
      await this.userProfileService.update(
        data.createdBy,
        {
          userId: data.createdBy,
          firstName: data.firstName,
          lastName: data.lastName,
        },
        session,
      );

      // create default configs
      await this.configBootstrapService.seedDefaultConfigs({
        organizationId: String(organization?.id),
        userId: data.createdBy,
        session,
      });

      // send success onboarding email
      await this.emailService.onboardingEmail({
        organizationName: organization?.name,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        dashboardUrl: DASHBOARD_URL_PATH,
        createdAt: organization?.createdAt,
        year: new Date().getFullYear(),
      });

      await session.commitTransaction();
      session.endSession();

      return {
        doc: {
          id: String(organization?.id),
          name: String(organization?.name),
        },
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }
}
