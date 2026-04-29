// container.ts
import { s3Client } from "./config/s3.client";
import { UserRepository } from "./repositories";
import { AccountRepository } from "./repositories/account.repository";
import { OrganizationRepository } from "./repositories/organization.repository";
import { RbacRepository } from "./repositories/rbac.repository";
import { SubscriptionRepository } from "./repositories/subscription.repository";
import { TeamRepository } from "./repositories/team.repository";
import { UserAccountRepository } from "./repositories/user-account.repository";
import { UserProfileRepository } from "./repositories/userprofile.repository";
import { UserService } from "./services";
import { AccountService } from "./services/account.service";
import { EmailService } from "./services/email.service";
import { MediaService } from "./services/media.service";
import { OrganizationOnboardingService } from "./services/organization-onboarding.service";
import { OrganizationService } from "./services/organization.service";
import { RbacService } from "./services/rbac.service";
import { UserAggregateService } from "./services/user-aggregate.service";
import { UserProfileService } from "./services/userprofile.service";

// REPOSITORIES
import { RecyclebinService } from "./services/recycleBin.service";

// repositories
export const userRepository = new UserRepository();
export const userProfileRepository = new UserProfileRepository();
export const organizationRepository = new OrganizationRepository();
export const accountRepository = new AccountRepository();
export const userAccountRepository = new UserAccountRepository();
export const teamRepository = new TeamRepository();
export const rbacRepository = new RbacRepository();
export const subscriptionRepository = new SubscriptionRepository();

// SERVICES (INJECT DEPENDECIES)
export const emailService = new EmailService();
export const userService = new UserService(
  userRepository,
  userProfileRepository,
  subscriptionRepository,
  emailService,
);
export const userProfileService = new UserProfileService(userProfileRepository);
export const organizationService = new OrganizationService(
  organizationRepository,
  teamRepository,
);
export const rbacService = new RbacService(rbacRepository);

export const accountService = new AccountService(
  rbacService,
  accountRepository,
  userAccountRepository,
  teamRepository,
  // userRepository,
  // emailService,
);

// user aggregate service
export const userAggregateService = new UserAggregateService(
  userService,
  organizationService,
);

// organization onboarding
export const organizationOnboardingService = new OrganizationOnboardingService(
  organizationService,
  userService,
  userProfileService,
  accountService,
  rbacService,
  emailService,
);

export const mediaService = new MediaService(s3Client);

export const recyclebinService= new RecyclebinService(
  accountRepository,
  userAccountRepository
)
