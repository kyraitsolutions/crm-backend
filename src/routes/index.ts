import { AccountRouter } from "./account.routes.js";
import { ChatBotRouter } from "./chat-bot.routes.js";
import { UserRouter } from "./user.routes.js";
import { Router } from "express";
// import { UserProfileRouter } from "./userprofile.routes.js";
import { EmailRouter } from "./email.routes.js";
import { TeamRouter } from "./team.routes.js";
import { SubscriptionRouter } from "./subscription.routes.js";
import { MediaRouter } from "./media.routes.js";
import { PaymentRouter } from "./payment.route.js";
import { OrganizationRouter } from "./organization.route.js";
import { RBACRouter } from "./rbac.routes.js";
import { VisitorRouter } from "./visitor.route.js";
import { ConversationRouter } from "./conversations.route.js";
import { MessageRouter } from "./message.route.js";
import { NotificationRouter } from "./notification.routes.js";
import { ContactRouter } from "./contact.routes.js";
import { ChatFlowRouter } from "./chatflow.route.js";
import { WhatsappRouter } from "./whatsapp.routes.js";

export class AppRoutes {
  private organizationRouter: OrganizationRouter;
  private accountRouter: AccountRouter;
  private chatBotRouter: ChatBotRouter;
  private chatFlowRouter: ChatFlowRouter;
  private userRouter: UserRouter;
  // private userProfileRouter: UserProfileRouter;

  private emailRouter: EmailRouter;
  private teamRouter: TeamRouter;
  private subscriptionRouter: SubscriptionRouter;
  private rbacRouter: RBACRouter;
  private mediaRouter: MediaRouter;
  private visitorRouter: VisitorRouter;
  private conversationRouter: ConversationRouter;
  private messageRouter: MessageRouter;
  private paymentRouter: PaymentRouter;
  private notificationRouter:NotificationRouter;
  private contactRouter:ContactRouter;
  private whatsappRouter:WhatsappRouter;

  private router: Router;

  constructor() {
    this.organizationRouter = new OrganizationRouter();
    this.accountRouter = new AccountRouter();
    this.chatBotRouter = new ChatBotRouter();
    this.chatFlowRouter = new ChatFlowRouter();
    this.userRouter = new UserRouter();

    // this.userProfileRouter = new UserProfileRouter();
    this.visitorRouter = new VisitorRouter();
    this.conversationRouter = new ConversationRouter();
    this.messageRouter = new MessageRouter();
    this.emailRouter = new EmailRouter();
    this.teamRouter = new TeamRouter();
    this.subscriptionRouter = new SubscriptionRouter();
    this.rbacRouter = new RBACRouter();
    this.mediaRouter = new MediaRouter();
    this.paymentRouter = new PaymentRouter();

    this.notificationRouter= new NotificationRouter()
    this.contactRouter=new ContactRouter()
    this.whatsappRouter=new WhatsappRouter()
    this.router = Router();
    this.initializeRoutes();
  }
  private initializeRoutes(): void {
    this.router.use("/auth", this.userRouter.getRouter());
    // this.router.use("/user/profile", this.userProfileRouter.getRouter());
    this.router.use("/organization", this.organizationRouter.getRouter());
    this.router.use("/account", this.accountRouter.getRouter());
    this.router.use("/visitor", this.visitorRouter.getRouter());
    this.router.use("/conversation", this.conversationRouter.getRouter());
    this.router.use("/message", this.messageRouter.getRouter());

    this.router.use("/chatbot", this.chatBotRouter.getRouter());
    this.router.use("/chatflow", this.chatFlowRouter.getRouter());
    this.router.use("/subscription", this.subscriptionRouter.getRouter());
    this.router.use("/team", this.teamRouter.getRouter());
    this.router.use("/email", this.emailRouter.getRouter());
    this.router.use("/roles", this.rbacRouter.getRouter());
    this.router.use("/media", this.mediaRouter.getRouter());
    this.router.use("/payment", this.paymentRouter.getRouter());

    this.router.use('/notifications', this.notificationRouter.getRouter());
    this.router.use('/contacts', this.contactRouter.getRouter());
    this.router.use('/whatsapp', this.whatsappRouter.getRouter());
  }

  public getRouter(): Router {
    return this.router;
  }
}
