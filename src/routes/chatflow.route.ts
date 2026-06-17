import { Router } from "express";
import { ChatFlowController } from "../controllers/chatflow.controller.js";
import { AuthMiddleware } from "../middleware/index.js";

export class ChatFlowRouter {
  public router: Router;
  private chatFlowController: ChatFlowController;
  constructor() {
    this.router = Router();
    this.chatFlowController = new ChatFlowController();
    this.initializeRoutes();
  }
  private initializeRoutes(): void {
    // create chat flow
    this.router.post(
      "/:accountId/create",
      AuthMiddleware.authenticate,
      this.chatFlowController.createChatbotFlow.bind(this.chatFlowController),
    );

    // get all chat flow by account id
    this.router.get(
      "/:accountId",
      AuthMiddleware.authenticate,
      this.chatFlowController.getAllChatFlowByAccountId.bind(
        this.chatFlowController,
      ),
    );

    // get chat flow by chatflow id
    this.router.get(
      "/:accountId/flow/:chatflowId",
      AuthMiddleware.authenticate,
      this.chatFlowController.getChatFlowById.bind(this.chatFlowController),
    );

    // update chat flow by chatflow id
    this.router.put(
      "/:chatflowId",
      AuthMiddleware.authenticate,
      this.chatFlowController.updateChatFlow.bind(this.chatFlowController),
    );

    // delete chat flow by chatflow id
    this.router.delete(
      "/:chatflowId",
      AuthMiddleware.authenticate,
      this.chatFlowController.deleteChatFlowById.bind(this.chatFlowController),
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}
