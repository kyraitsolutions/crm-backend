// services/user-aggregate.service.ts

import { ROLES } from "../config/permissions.js";
import { rbacService } from "../container.js";
import { TUserAggregate } from "../types/user.type.js";
import { OrganizationService } from "./organization.service.js";
import { SubscriptionService } from "./subscription.service.js";
import { UserService } from "./user.service.js";

export class UserAggregateService {
  constructor(
    private userService: UserService,
    private organizationService: OrganizationService,
    private subscriptionService:SubscriptionService
  ) {}

  async getMe(userId: string, includes: string[]): Promise<TUserAggregate> {
    const user = await this.userService.getUserById(userId);

    let organization = null;
    let role = null;
    let perms: string[] | [] = [];
    let subscription=null;

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
        perms = await rbacService.getPermissionsByRole(role?.id);
      }
    }

    subscription=await this.subscriptionService.getCurrentSubscription(userId);


    return {
      ...user,
      ...(organization && { organization }),
      ...(role && {
        role: { name: role.name, level: role.level },
      }),
      ...(perms && { permissions: perms }),
      ...(subscription&&{subscription:subscription})
    };
  }
}
