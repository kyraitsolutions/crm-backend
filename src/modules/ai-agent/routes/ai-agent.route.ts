import { Router } from "express";
import { AuthMiddleware } from "../../../middleware/auth.middleware.js";
import { AiAgentController } from "../controllers/ai-agent.controller.js";
import { AiAgentRuntimeController } from "../controllers/ai-agent-runtime.controller.js";
import { AiAgentToolsController } from "../controllers/ai-agent-tools.controller.js";
import { AiKnowledgeController } from "../controllers/ai-knowledge.controller.js";

export class AiAgentRouter {
  public router = Router({ mergeParams: true });
  private controller = new AiAgentController();
  private knowledgeController = new AiKnowledgeController();
  private runtimeController = new AiAgentRuntimeController();
  private toolsController = new AiAgentToolsController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get("/", AuthMiddleware.authenticate, this.controller.get);
    this.router.post("/", AuthMiddleware.authenticate, this.controller.create);
    this.router.put(
      "/draft",
      AuthMiddleware.authenticate,
      this.controller.updateDraft,
    );
    this.router.post(
      "/publish",
      AuthMiddleware.authenticate,
      this.controller.publish,
    );
    this.router.post(
      "/rollback",
      AuthMiddleware.authenticate,
      this.controller.rollback,
    );
    this.router.get(
      "/versions",
      AuthMiddleware.authenticate,
      this.controller.listVersions,
    );
    this.router.get(
      "/versions/:versionId",
      AuthMiddleware.authenticate,
      this.controller.getVersion,
    );
    this.router.get(
      "/skills/catalog",
      AuthMiddleware.authenticate,
      this.controller.listSkillsCatalog,
    );
    this.router.post(
      "/skills/draft",
      AuthMiddleware.authenticate,
      this.controller.draftSkill,
    );

    this.router.get(
      "/knowledge",
      AuthMiddleware.authenticate,
      this.knowledgeController.list,
    );
    this.router.post(
      "/knowledge",
      AuthMiddleware.authenticate,
      this.knowledgeController.create,
    );

    this.router.post(
      "/knowledge/retrieve",
      AuthMiddleware.authenticate,
      this.knowledgeController.retrieve,
    );
    this.router.post(
      "/knowledge/:id/reindex",
      AuthMiddleware.authenticate,
      this.knowledgeController.reindex,
    );
    this.router.put(
      "/knowledge/:id",
      AuthMiddleware.authenticate,
      this.knowledgeController.update,
    );
    this.router.delete(
      "/knowledge/:id",
      AuthMiddleware.authenticate,
      this.knowledgeController.remove,
    );

    this.router.post(
      "/runtime/test",
      AuthMiddleware.authenticate,
      this.runtimeController.invoke,
    );
    this.router.get(
      "/runtime/runs",
      AuthMiddleware.authenticate,
      this.runtimeController.listRuns,
    );
    this.router.get(
      "/runtime/runs/:runId",
      AuthMiddleware.authenticate,
      this.runtimeController.getRun,
    );

    this.router.get(
      "/tools",
      AuthMiddleware.authenticate,
      this.toolsController.list,
    );
    this.router.post(
      "/tools/test",
      AuthMiddleware.authenticate,
      this.toolsController.test,
    );
    this.router.post(
      "/tools/execute",
      AuthMiddleware.authenticate,
      this.toolsController.execute,
    );
  }

  getRouter() {
    return this.router;
  }
}
