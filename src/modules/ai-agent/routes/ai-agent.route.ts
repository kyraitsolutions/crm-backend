import { Router } from "express";
import { AuthMiddleware } from "../../../middleware/auth.middleware.js";
import { requirePermission } from "../../../middleware/authorization.middleware.js";
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
    const view = [
      AuthMiddleware.authenticate,
      requirePermission("whatsapp.view"),
    ] as const;
    const edit = [
      AuthMiddleware.authenticate,
      requirePermission("whatsapp.edit"),
    ] as const;

    this.router.get("/", ...view, this.controller.get);
    this.router.post("/", ...edit, this.controller.create);
    this.router.put("/draft", ...edit, this.controller.updateDraft);
    this.router.post("/publish", ...edit, this.controller.publish);
    this.router.post("/rollback", ...edit, this.controller.rollback);
    this.router.get("/versions", ...view, this.controller.listVersions);
    this.router.get(
      "/versions/:versionId",
      ...view,
      this.controller.getVersion,
    );
    this.router.get(
      "/skills/catalog",
      ...view,
      this.controller.listSkillsCatalog,
    );
    this.router.post("/skills/draft", ...edit, this.controller.draftSkill);

    this.router.get("/knowledge", ...view, this.knowledgeController.list);
    this.router.post("/knowledge", ...edit, this.knowledgeController.create);

    this.router.post(
      "/knowledge/retrieve",
      ...view,
      this.knowledgeController.retrieve,
    );
    this.router.post(
      "/knowledge/:id/reindex",
      ...edit,
      this.knowledgeController.reindex,
    );
    this.router.put(
      "/knowledge/:id",
      ...edit,
      this.knowledgeController.update,
    );
    this.router.delete(
      "/knowledge/:id",
      ...edit,
      this.knowledgeController.remove,
    );

    this.router.post(
      "/runtime/test",
      ...edit,
      this.runtimeController.invoke,
    );
    this.router.get(
      "/runtime/runs",
      ...view,
      this.runtimeController.listRuns,
    );
    this.router.get(
      "/runtime/runs/:runId",
      ...view,
      this.runtimeController.getRun,
    );

    this.router.get("/tools", ...view, this.toolsController.list);
    this.router.post("/tools/test", ...edit, this.toolsController.test);
    this.router.post(
      "/tools/execute",
      ...edit,
      this.toolsController.execute,
    );
  }

  getRouter() {
    return this.router;
  }
}
