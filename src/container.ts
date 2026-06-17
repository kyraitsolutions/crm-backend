// container.ts
import { s3Client } from "./config/s3.client.js";
import { AccountRepository } from "./repositories/account.repository.js";
import { OrganizationRepository } from "./repositories/organization.repository.js";
import { RbacRepository } from "./repositories/rbac.repository.js";
import { SubscriptionRepository } from "./repositories/subscription.repository.js";
import { TeamRepository } from "./repositories/team.repository.js";
import { UserAccountRepository } from "./repositories/user-account.repository.js";
import { UserProfileRepository } from "./repositories/userprofile.repository.js";
import { AccountService } from "./services/account.service.js";
import { EmailService } from "./services/email.service.js";
import { MediaService } from "./services/media.service.js";
import { OrganizationOnboardingService } from "./services/organization-onboarding.service.js";
import { OrganizationService } from "./services/organization.service.js";
import { RbacService } from "./services/rbac.service.js";
import { UserAggregateService } from "./services/user-aggregate.service.js";
import { UserProfileService } from "./services/userprofile.service.js";
import { RecyclebinService } from "./services/recycleBin.service.js";
import { VisitorRepository } from "./repositories/visitor.repository.js";
import { ConversationRepository } from "./repositories/conversations.repository.js";
import { MessageRepository } from "./repositories/messages.repository.js";
import { VisitorService } from "./services/visitor.service.js";
import { NotificationService } from "./services/notifcation.service.js";
import { NotificationRepository } from "./repositories/notification.repository.js";
import { ContactService } from "./services/contact.service.js";
import { ContactRepository } from "./repositories/contact.repository.js";
import { ChatFlowService } from "./services/chatflow.service.js";
import { ChatFlowRepository } from "./repositories/chatflow.repository.js";
import { WhatsappService } from "./services/whatsapp.service.js";
import { WhatsappRepository } from "./repositories/whatsapp.respository.js";
import { ConfigRepository } from "./repositories/config.repository.js";
import { ConfigBootstrapService } from "./services/configBootstrap.service.js";
import {SubscriptionService} from "./services/subscription.service.js"
import { UserRepository } from "./repositories/user.repository.js";
import { UserService } from "./services/user.service.js";

// REPOSITORIES
export const userRepository = new UserRepository();
export const userProfileRepository = new UserProfileRepository();
export const organizationRepository = new OrganizationRepository();
export const accountRepository = new AccountRepository();
export const userAccountRepository = new UserAccountRepository();
export const teamRepository = new TeamRepository();
export const rbacRepository = new RbacRepository();
export const configRepository = new ConfigRepository();
export const subscriptionRepository = new SubscriptionRepository();
export const chatflowRepo = new ChatFlowRepository();
export const visitorRepository = new VisitorRepository();
export const conversationRepository = new ConversationRepository();
export const messageRepository = new MessageRepository();
export const notificationRepository=new NotificationRepository();
export const contactRepository=new ContactRepository();
export const whatsappRepository=new WhatsappRepository();

// SERVICES (INJECT DEPENDECIES)
export const emailService = new EmailService();
export const subscriptionService=new SubscriptionService()

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
  // teamRepository,
  // userRepository,
  // emailService,
);

// user aggregate service
export const userAggregateService = new UserAggregateService(
  userService,
  organizationService,
  subscriptionService
);

export const configBootstrapService = new ConfigBootstrapService(
  configRepository,
);

// organization onboarding
export const organizationOnboardingService = new OrganizationOnboardingService(
  organizationService,
  userService,
  userProfileService,
  accountService,
  rbacService,
  configBootstrapService,
  emailService,
);

export const chatflowService = new ChatFlowService(
  chatflowRepo,
  accountRepository,
);

export const visitorService = new VisitorService(visitorRepository);

// media service
export const mediaService = new MediaService(s3Client);

// recyclebin service
export const recyclebinService = new RecyclebinService(
  // accountRepository,
  // userAccountRepository,
);
// notification service
export const notificationService = new NotificationService(
  accountRepository,
  notificationRepository,
);
// Contact service
export const contactService = new ContactService(
  contactRepository
);



export const whatsppService=new WhatsappService(
  whatsappRepository
)