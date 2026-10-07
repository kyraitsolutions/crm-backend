import { Router } from "express";
import { AuthMiddleware } from "../../../middleware/auth.middleware.js";
import { requirePermission } from "../../../middleware/authorization.middleware.js";
import { WhatsAppAiAgentController } from "../ai-agent/controllers/whatsapp-ai-agent.controller.js";

export class WhatsappAiAgentRouter {
  public router = Router({ mergeParams: true });
  private controller = new WhatsAppAiAgentController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    const view = [
      AuthMiddleware.authenticate,
      requirePermission("whatsapp.view"),
    ] as const;
    const edit = [
      AuthMiddleware.authenticate,
      requirePermission("whatsapp.edit"),
    ] as const;

    this.router.get("/", ...view, this.controller.getConfig);
    this.router.put("/", ...edit, this.controller.updateConfig);
    this.router.post(
      "/knowledge",
      ...edit,
      this.controller.createKnowledge,
    );
    this.router.put(
      "/knowledge/:id",
      ...edit,
      this.controller.updateKnowledge,
    );
    this.router.delete(
      "/knowledge/:id",
      ...edit,
      this.controller.removeKnowledge,
    );
    this.router.post(
      "/conversations/:conversationId/resume",
      ...edit,
      this.controller.resumeConversation,
    );
  }

  getRouter() {
    return this.router;
  }
}
