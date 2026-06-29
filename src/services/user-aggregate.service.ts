// services/user-aggregate.service.ts

import { ROLES } from "../config/permissions.js";
import { rbacService } from "../container.js";
import { TApiResponse } from "../types/api-response.type.js";
import { TUserAggregate } from "../types/user.type.js";
import { OrganizationService } from "./organization.service.js";
import { SubscriptionService } from "./subscription.service.js";
import { UserService } from "./user.service.js";

export class UserAggregateService {
  constructor(
    private userService: UserService,
    private organizationService: OrganizationService,
    private subscriptionService: SubscriptionService,
  ) {}

  async getMe(
    userId: string,
    role: { id: string; name: string; level: number },
    includes: string[],
  ): Promise<TApiResponse<TUserAggregate>> {
    const user = await this.userService.getUserById(userId);

    let organization = null;
    let perms: string[] = [];
    let subscription = null;

    if (includes.includes("organization")) {
      const orgDetails =
        await this.organizationService.getOrganizationMembersByUserId(userId);

      if (orgDetails) organization = orgDetails?.organizationId;
    }
    if (includes.includes("permissions") && role && role.id) {
      if (role?.name === ROLES.OWNER) {
        perms = ["*"];
      } else {
        const { docs } = await rbacService.getPermissionsByRole(role?.id);
        perms = docs;
      }
    }

    subscription =
      await this.subscriptionService.getCurrentSubscription(userId);

    return {
      doc: {
        ...user,
        ...(organization && { organization }),
        ...(role && {
          role: { name: role.name, level: role.level },
        }),
        ...(perms && perms.length && { permissions: perms }),
        ...(subscription && { subscription: subscription }),
      },
    };
  }
}
