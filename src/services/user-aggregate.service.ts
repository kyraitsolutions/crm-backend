// services/user-aggregate.service.ts

import { ROLES } from "../config/permissions";
import { rbacService } from "../container";
import { TUserAggregate } from "../types";
import { OrganizationService } from "./organization.service";
import { UserService } from "./user.service";

export class UserAggregateService {
  constructor(
    private userService: UserService,
    private organizationService: OrganizationService,
  ) {}

  async getMe(userId: string, includes: string[]): Promise<TUserAggregate> {
    const user = await this.userService.getUserById(userId);

    let organization = null;
    let role = null;
    let perms: string[] | [] = [];

    if (includes.includes("organization")) {
      const orgDetails =
        await this.organizationService.getOrganizationMembersByUserId(userId);

      organization = orgDetails?.organizationId;
      role = orgDetails?.roleId;
    }
    if (includes.includes("permissions")) {
      if (role?.name === ROLES.OWNER) {
        perms = ["*"];
      } else {
        console.log("ider aaye");
        perms = await rbacService.getPermissionsByRole(role?.id);
        console.log(perms);
      }
    }

    return {
      ...user,
      ...(organization && { organization }),
      ...(role && {
        role: { name: role.name, level: role.level },
      }),
      ...(perms && { permissions: perms }),
    };
  }
}
