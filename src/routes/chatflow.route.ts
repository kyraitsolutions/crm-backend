import { Router } from "express";
import { ChatFlowController } from "../controllers/chatflow.controller.js";
import { AuthMiddleware } from "../middleware/index.js";
import { requirePermission } from "../middleware/authorization.middleware.js";

export class ChatFlowRouter {
  public router: Router;
  private chatFlowController: ChatFlowController;
  constructor() {
    this.router = Router();
    this.chatFlowController = new ChatFlowController();
    this.initializeRoutes();
  }
  private initializeRoutes(): void {
    this.router.post(
      "/:accountId/create",
      AuthMiddleware.authenticate,
      requirePermission("chatbots.create"),
      this.chatFlowController.createChatbotFlow.bind(this.chatFlowController),
    );

    this.router.post(
      "/:accountId/generate",
      AuthMiddleware.authenticate,
      requirePermission("chatbots.create"),
      this.chatFlowController.generateChatFlow.bind(this.chatFlowController),
    );

    this.router.get(
      "/:accountId",
      AuthMiddleware.authenticate,
      requirePermission("chatbots.view"),
      this.chatFlowController.getAllChatFlowByAccountId.bind(
        this.chatFlowController,
      ),
    );

    this.router.get(
      "/:accountId/flow/:chatflowId",
      AuthMiddleware.authenticate,
      requirePermission("chatbots.view"),
      this.chatFlowController.getChatFlowById.bind(this.chatFlowController),
    );

    this.router.put(
      "/:chatflowId",
      AuthMiddleware.authenticate,
      requirePermission("chatbots.edit"),
      this.chatFlowController.updateChatFlow.bind(this.chatFlowController),
    );

    this.router.delete(
      "/:chatflowId",
      AuthMiddleware.authenticate,
      requirePermission("chatbots.delete"),
      this.chatFlowController.deleteChatFlowById.bind(this.chatFlowController),
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}
