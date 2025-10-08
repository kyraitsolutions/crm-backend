import { ChatBotRouter } from "./chat-bot.routes";
import { UserRouter } from "./user.routes";
import { Router } from "express";

export class AppRoutes {
  private chatBotRouter: ChatBotRouter;
  private userRouter: UserRouter;
  private router: Router;

  constructor() {
    this.chatBotRouter = new ChatBotRouter();
    this.userRouter = new UserRouter();
    this.router = Router();
    this.initializeRoutes();
  }
  private initializeRoutes(): void {
    this.router.use("/auth", this.userRouter.getRouter());
    this.router.use("/chatbot", this.chatBotRouter.getRouter());
  }

  public getRouter(): Router {
    return this.router;
  }
}
