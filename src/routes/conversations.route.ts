// routes/conversation.route.ts

import { Router } from "express";
import { ConversationController } from "../controllers/conversations.controller.js";

export class ConversationRouter {
  private router: Router;
  private controller: ConversationController;

  constructor() {
    this.router = Router();
    this.controller = new ConversationController();

    this.initializeRoutes();
  }

  private initializeRoutes() {
    // INIT CONVERSATION
    this.router.post(
      "/init",
      this.controller.initConversation.bind(this.controller),
    );

    // GET SINGLE CONVERSATION
    // this.router.get(
    //   "/:conversationId",
    //   this.controller.getConversationById.bind(this.controller),
    // );

    // GET ALL CONVERSATIONS BY ACCOUNT ID
    this.router.get(
      "/:accountId",
      this.controller.getConversationsByAccountId.bind(this.controller),
    );

    // GET VISITOR CONVERSATION
    this.router.get(
      "/visitor/:visitorId",
      this.controller.getConversationByVisitor.bind(this.controller),
    );
  }

  public getRouter() {
    return this.router;
  }
}
