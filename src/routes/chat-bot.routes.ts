import { Router } from "express";
import { ChatBotController } from "../controllers/chat-bot.controller.js";
import { AuthMiddleware } from "../middleware/index.js";

export class ChatBotRouter {
  public router: Router;
  private chatBotController: ChatBotController;
  constructor() {
    this.router = Router();
    this.chatBotController = new ChatBotController();
    this.initializeRoutes();
  }
  private initializeRoutes(): void {
    // get All chatbot for user
    this.router.get(
      "/",
      AuthMiddleware.authenticate,
      this.chatBotController.getChatBot.bind(this.chatBotController),
    );

    // get particular chatbot data
    this.router.get(
      "/:chatbotId",
      AuthMiddleware.authenticate,
      this.chatBotController.getChatBotById.bind(this.chatBotController),
    );

    // create chatbot for user
    this.router.post(
      "/:accountId",
      AuthMiddleware.authenticate,
      this.chatBotController.createChatBot.bind(this.chatBotController),
    );

    // get chatbot with flow
    this.router.get(
      "/:accountId/:chatbotId/flow",
      this.chatBotController.getChatBotWithFlow.bind(this.chatBotController),
    );

    // update chatbot for user
    this.router.put(
      "/:id",
      AuthMiddleware.authenticate,
      this.chatBotController.updateChatBot.bind(this.chatBotController),
    );

    // delete chatbot for user
    this.router.delete(
      "/:id",
      AuthMiddleware.authenticate,
      this.chatBotController.deleteChatBot.bind(this.chatBotController),
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}
