import { AccountRouter } from "./account.routes.js";
import { ChatBotRouter } from "./chat-bot.routes.js";
import { UserRouter } from "./user.routes.js";
import { Router } from "express";
// import { UserProfileRouter } from "./userprofile.routes.js";
import { EmailRouter } from "./email.routes.js";
import { TeamRouter } from "./team.routes.js";
import { SubscriptionRouter } from "./subscription.routes.js";
import { OrganizationRouter } from "./organization.route.js";

export class AppRoutes {
  private organizationRouter: OrganizationRouter;
  private accountRouter: AccountRouter;
  private chatBotRouter: ChatBotRouter;
  private userRouter: UserRouter;
  // private userProfileRouter: UserProfileRouter;
  private emailRouter: EmailRouter;
  private teamRouter: TeamRouter;
  private subscriptionRouter: SubscriptionRouter;
  private router: Router;

  constructor() {
    this.organizationRouter = new OrganizationRouter();
    this.accountRouter = new AccountRouter();
    this.chatBotRouter = new ChatBotRouter();
    this.userRouter = new UserRouter();
    // this.userProfileRouter = new UserProfileRouter();
    this.emailRouter = new EmailRouter();
    this.teamRouter = new TeamRouter();
    this.subscriptionRouter = new SubscriptionRouter();
    this.router = Router();
    this.initializeRoutes();
  }
  private initializeRoutes(): void {
    this.router.use("/auth", this.userRouter.getRouter());
    // this.router.use("/user/profile", this.userProfileRouter.getRouter());
    this.router.use("/organization", this.organizationRouter.getRouter());
    this.router.use("/account", this.accountRouter.getRouter());
    this.router.use("/chatbot", this.chatBotRouter.getRouter());
    this.router.use("/subscription", this.subscriptionRouter.getRouter());
    this.router.use("/team", this.teamRouter.getRouter());
    this.router.use("/email", this.emailRouter.getRouter());
  }

  public getRouter(): Router {
    return this.router;
  }
}
