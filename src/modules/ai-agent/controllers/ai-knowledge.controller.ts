import { NextFunction, Request, Response } from "express";
import { FEATURE } from "../../../constants/subscription.constant.js";
import { SubscriptionService } from "../../../services/subscription.service.js";
import { handleRouteError } from "../../../utils/asyncHandler.js";
import { HttpError } from "../../../utils/http.error.js";
import httpResponse from "../../../utils/http.response.js";
import { asEntityId } from "../../../utils/request-context.utils.js";
import {
  CreateAiKnowledgeSourceDto,
  RetrieveAiKnowledgeDto,
} from "../dtos/ai-knowledge.dto.js";
import { aiKnowledgeService } from "../services/ai-knowledge.service.js";

export class AiKnowledgeController {
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

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      await this.assertFeature(organizationId);
      const doc = await aiKnowledgeService.list(organizationId, accountId);
      httpResponse(req, res, 200, "Knowledge sources fetched", { doc });
    } catch (error) {
      handleRouteError("AiKnowledgeController.list", error, next, req);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      await this.assertFeature(organizationId);
      const dto = new CreateAiKnowledgeSourceDto(req.body || {});

      const doc = await aiKnowledgeService.create(organizationId, accountId, dto);
      
      httpResponse(req, res, 201, "Knowledge source created", { doc });
    } catch (error) {
      handleRouteError("AiKnowledgeController.create", error, next, req);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      await this.assertFeature(organizationId);
      const sourceId = String(req.params.id || "");
      if (!sourceId) throw HttpError.badRequest("Knowledge source is required");
      const dto = new CreateAiKnowledgeSourceDto(req.body || {});
      const doc = await aiKnowledgeService.update(
        organizationId,
        accountId,
        sourceId,
        dto,
      );
      httpResponse(req, res, 200, "Knowledge source updated", { doc });
    } catch (error) {
      handleRouteError("AiKnowledgeController.update", error, next, req);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      await this.assertFeature(organizationId);
      const sourceId = String(req.params.id || "");
      if (!sourceId) throw HttpError.badRequest("Knowledge source is required");
      const doc = await aiKnowledgeService.remove(
        organizationId,
        accountId,
        sourceId,
      );
      httpResponse(req, res, 200, "Knowledge source deleted", { doc });
    } catch (error) {
      handleRouteError("AiKnowledgeController.remove", error, next, req);
    }
  };

  reindex = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      await this.assertFeature(organizationId);
      const sourceId = String(req.params.id || "");
      if (!sourceId) throw HttpError.badRequest("Knowledge source is required");
      const doc = await aiKnowledgeService.reindex(
        organizationId,
        accountId,
        sourceId,
      );
      httpResponse(req, res, 200, "Knowledge source reindexed", { doc });
    } catch (error) {
      handleRouteError("AiKnowledgeController.reindex", error, next, req);
    }
  };

  retrieve = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      await this.assertFeature(organizationId);
      const dto = new RetrieveAiKnowledgeDto(req.body || {});
      const doc = await aiKnowledgeService.retrieve(
        organizationId,
        accountId,
        dto,
      );
      httpResponse(req, res, 200, "Knowledge retrieved", { doc });
    } catch (error) {
      handleRouteError("AiKnowledgeController.retrieve", error, next, req);
    }
  };
}
