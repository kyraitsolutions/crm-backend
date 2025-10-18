import { Router } from "express";
import { ChatBotController } from "../controllers";
import { AuthMiddleware } from "../middleware";

export class ChatBotRouter {
  public router: Router;
  private chatBotController: ChatBotController;
  constructor() {
    this.router = Router();
    this.chatBotController = new ChatBotController();
    this.initializeRoutes();
  }
  private initializeRoutes(): void {
    this.router.get(
      "/byuser",
      AuthMiddleware.authenticate,
      this.chatBotController.getChatBot.bind(this.chatBotController)
    );
    this.router.get(
      "/byaccount",
      AuthMiddleware.authenticate,
      this.chatBotController.getChatBots.bind(this.chatBotController)
    );
    this.router.post(
      "/",
      AuthMiddleware.authenticate,
      this.chatBotController.createChatBot.bind(this.chatBotController)
    );
    this.router.put(
      "/:id",
      AuthMiddleware.authenticate,
      this.chatBotController.updateChatBot.bind(this.chatBotController)
    );
    this.router.delete(
      "/:id",
      AuthMiddleware.authenticate,
      this.chatBotController.deleteChatBot.bind(this.chatBotController)
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}
