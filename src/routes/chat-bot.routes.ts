import { Router } from "express";
import { AuthMiddleware } from "../middleware";
import { ChatbotController } from "../controllers";

export class ChatBotRouter {
  public router: Router;
  private chatbotController: ChatbotController;

  constructor() {
    this.router = Router();
    this.chatbotController = new ChatbotController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.post(
      "/",
      AuthMiddleware.authenticate,
      this.chatbotController.createChatbot.bind(this.chatbotController)
    );

    this.router.get(
      "/:id",
      AuthMiddleware.authenticate,
      this.chatbotController.getChatbotById.bind(this.chatbotController)
    );

    this.router.get(
      "/",
      AuthMiddleware.authenticate,
      this.chatbotController.getAllChatbots.bind(this.chatbotController)
    );
    this.router.get(
      "/by-account",
      AuthMiddleware.authenticate,
      this.chatbotController.getAllChatbotsByAccount.bind(
        this.chatbotController
      )
    );

    this.router.put(
      "/:id",
      AuthMiddleware.authenticate,
      this.chatbotController.updateChatbot.bind(this.chatbotController)
    );

    this.router.delete(
      "/:id",
      AuthMiddleware.authenticate,
      this.chatbotController.deleteChatbot.bind(this.chatbotController)
    ); // delete chatbot and all related data
  }

  public getRouter(): Router {
    return this.router;
  }
}
