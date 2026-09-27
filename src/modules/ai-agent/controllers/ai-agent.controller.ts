import { NextFunction, Request, Response } from "express";
import { FEATURE } from "../../../constants/subscription.constant.js";
import { SubscriptionService } from "../../../services/subscription.service.js";
import { handleRouteError } from "../../../utils/asyncHandler.js";
import { HttpError } from "../../../utils/http.error.js";
import httpResponse from "../../../utils/http.response.js";
import { asEntityId } from "../../../utils/request-context.utils.js";
import { CreateAiAgentDto, UpdateAiAgentDraftDto } from "../dtos/ai-agent.dto.js";
import { DraftSkillDto } from "../dtos/draft-skill.dto.js";
import { aiAgentService } from "../services/ai-agent.service.js";

export class AiAgentController {
  private subscriptionService = new SubscriptionService();

  private orgAccount(req: Request) {
    const organizationId = asEntityId(req.user?.organizationId);
    const accountId = String(req.params.accountId || "");
    if (!organizationId || !accountId) {
      throw HttpError.forbidden("Organization and account are required");
    }
    return { organizationId, accountId };
  }

  private async assertFeature(organizationId: string) {
    await this.subscriptionService.checkFeature(
      organizationId,
      FEATURE.WHATSAPP_AI_AGENT,
    );
  }

  get = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      await this.assertFeature(organizationId);
      const doc = await aiAgentService.get(organizationId, accountId);
      httpResponse(req, res, 200, "AI agent fetched", { doc });
    } catch (error) {
      handleRouteError("AiAgentController.get", error, next, req);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      await this.assertFeature(organizationId);
      const dto = new CreateAiAgentDto(req.body || {});
      const doc = await aiAgentService.create(organizationId, accountId, dto);
      httpResponse(req, res, 201, "AI agent created", { doc });
    } catch (error) {
      handleRouteError("AiAgentController.create", error, next, req);
    }
  };

  updateDraft = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      await this.assertFeature(organizationId);
      const dto = new UpdateAiAgentDraftDto(req.body || {});
      const doc = await aiAgentService.updateDraft(organizationId, accountId, dto);
      httpResponse(req, res, 200, "AI agent draft saved", { doc });
    } catch (error) {
      handleRouteError("AiAgentController.updateDraft", error, next, req);
    }
  };

  publish = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      await this.assertFeature(organizationId);
      const doc = await aiAgentService.publish(organizationId, accountId);
      httpResponse(req, res, 200, "AI agent published", { doc });
    } catch (error) {
      handleRouteError("AiAgentController.publish", error, next, req);
    }
  };

  rollback = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      await this.assertFeature(organizationId);
      const versionId = String(req.body?.versionId || req.params.versionId || "");
      if (!versionId) throw HttpError.badRequest("Version is required");
      const doc = await aiAgentService.rollback(
        organizationId,
        accountId,
        versionId,
      );
      httpResponse(req, res, 200, "AI agent restored", { doc });
    } catch (error) {
      handleRouteError("AiAgentController.rollback", error, next, req);
    }
  };

  listVersions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      await this.assertFeature(organizationId);
      const doc = await aiAgentService.listVersions(organizationId, accountId);
      httpResponse(req, res, 200, "AI agent versions fetched", { doc });
    } catch (error) {
      handleRouteError("AiAgentController.listVersions", error, next, req);
    }
  };

  getVersion = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      await this.assertFeature(organizationId);
      const versionId = String(req.params.versionId || "");
      if (!versionId) throw HttpError.badRequest("Version is required");
      const doc = await aiAgentService.getVersion(
        organizationId,
        accountId,
        versionId,
      );
      httpResponse(req, res, 200, "AI agent version fetched", { doc });
    } catch (error) {
      handleRouteError("AiAgentController.getVersion", error, next, req);
    }
  };

  listSkillsCatalog = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = this.orgAccount(req);
      await this.assertFeature(organizationId);
      const doc = aiAgentService.getSkillCatalog();
      httpResponse(req, res, 200, "AI agent skill catalog fetched", { doc });
    } catch (error) {
      handleRouteError("AiAgentController.listSkillsCatalog", error, next, req);
    }
  };

  draftSkill = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      await this.assertFeature(organizationId);
      const dto = new DraftSkillDto(req.body || {});
      const doc = await aiAgentService.draftSkill(organizationId, accountId, dto);
      httpResponse(req, res, 200, "AI agent skill drafted", { doc });
    } catch (error) {
      handleRouteError("AiAgentController.draftSkill", error, next, req);
    }
  };
}
