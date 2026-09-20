import { Router } from "express";
import { AuthMiddleware } from "../../../middleware/auth.middleware.js";
import { WhatsAppAiAgentController } from "../ai-agent/controllers/whatsapp-ai-agent.controller.js";

export class WhatsappAiAgentRouter {
  public router = Router({ mergeParams: true });
  private controller = new WhatsAppAiAgentController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get("/", AuthMiddleware.authenticate, this.controller.getConfig);
    this.router.put("/", AuthMiddleware.authenticate, this.controller.updateConfig);
    this.router.post(
      "/knowledge",
      AuthMiddleware.authenticate,
      this.controller.createKnowledge,
    );
    this.router.put(
      "/knowledge/:id",
      AuthMiddleware.authenticate,
      this.controller.updateKnowledge,
    );
    this.router.delete(
      "/knowledge/:id",
      AuthMiddleware.authenticate,
      this.controller.removeKnowledge,
    );
    this.router.post(
      "/conversations/:conversationId/resume",
      AuthMiddleware.authenticate,
      this.controller.resumeConversation,
    );
  }

  getRouter() {
    return this.router;
  }
}
