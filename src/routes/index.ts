import { AccountRouter } from "./account.routes";
import { ChatBotRouter } from "./chat-bot.routes";
import { UserRouter } from "./user.routes";
import { Router } from "express";
import { UserProfileRouter } from "./userprofile.routes";
import { EmailRouter } from "./email.routes";
import { TeamRouter } from "./team.routes";

export class AppRoutes {
  private chatBotRouter: ChatBotRouter;
  private userRouter: UserRouter;
  private accountRouter: AccountRouter;
  private userProfileRouter: UserProfileRouter;
  private emailRouter: EmailRouter;
  private teamRouter: TeamRouter;
  private router: Router;

  constructor() {
    this.chatBotRouter = new ChatBotRouter();
    this.userRouter = new UserRouter();
    this.accountRouter = new AccountRouter();
    this.userProfileRouter = new UserProfileRouter();
    this.emailRouter = new EmailRouter();
    this.teamRouter = new TeamRouter();
    this.router = Router();
    this.initializeRoutes();
  }
  private initializeRoutes(): void {
    this.router.use("/auth", this.userRouter.getRouter());
    this.router.use("/chatbot", this.chatBotRouter.getRouter());
    this.router.use("/subscription", this.chatBotRouter.getRouter());
    this.router.use("/account", this.accountRouter.getRouter());
    this.router.use("/user/profile", this.userProfileRouter.getRouter());
    this.router.use("/team", this.teamRouter.getRouter());
    this.router.use("/mail", this.emailRouter.getRouter());

  }

  public getRouter(): Router {
    return this.router;
  }
}
