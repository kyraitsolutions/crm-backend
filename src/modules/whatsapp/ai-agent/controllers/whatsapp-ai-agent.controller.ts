import { NextFunction, Request, Response } from "express";
import { FEATURE } from "../../../../constants/subscription.constant.js";
import { SubscriptionService } from "../../../../services/subscription.service.js";
import { handleRouteError } from "../../../../utils/asyncHandler.js";
import { HttpError } from "../../../../utils/http.error.js";
import httpResponse from "../../../../utils/http.response.js";
import { asEntityId } from "../../../../utils/request-context.utils.js";
import { aiAgentConfigService } from "../services/ai-agent-config.service.js";
import { aiAgentKnowledgeService } from "../services/ai-agent-knowledge.service.js";
import { aiAgentToolsService } from "../services/ai-agent-tools.service.js";

export class WhatsAppAiAgentController {
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

  getConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      await this.assertFeature(organizationId);
      const [config, knowledge, assets] = await Promise.all([
        aiAgentConfigService.getOrCreate(organizationId, accountId),
        aiAgentKnowledgeService.list(accountId),
        aiAgentToolsService.listSendableAssets(accountId),
      ]);
      httpResponse(req, res, 200, "AI sales agent config", {
        doc: { ...config, knowledge, assets },
      });
    } catch (error) {
      handleRouteError("WhatsAppAiAgentController.getConfig", error, next, req);
    }
  };

  updateConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      await this.assertFeature(organizationId);
      const doc = await aiAgentConfigService.update(
        organizationId,
        accountId,
        req.body || {},
      );
      httpResponse(req, res, 200, "AI sales agent config saved", { doc });
    } catch (error) {
      handleRouteError("WhatsAppAiAgentController.updateConfig", error, next, req);
    }
  };

  createKnowledge = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      await this.assertFeature(organizationId);
      const doc = await aiAgentKnowledgeService.create({
        organizationId,
        accountId,
        title: req.body?.title,
        content: req.body?.content,
        tags: req.body?.tags,
      });
      httpResponse(req, res, 201, "Knowledge article created", { doc });
    } catch (error) {
      handleRouteError("WhatsAppAiAgentController.createKnowledge", error, next, req);
    }
  };

  updateKnowledge = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      await this.assertFeature(organizationId);
      const doc = await aiAgentKnowledgeService.update(
        accountId,
        req.params.id,
        req.body || {},
      );
      httpResponse(req, res, 200, "Knowledge article updated", { doc });
    } catch (error) {
      handleRouteError("WhatsAppAiAgentController.updateKnowledge", error, next, req);
    }
  };

  removeKnowledge = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      await this.assertFeature(organizationId);
      const doc = await aiAgentKnowledgeService.remove(accountId, req.params.id);
      httpResponse(req, res, 200, "Knowledge article deleted", { doc });
    } catch (error) {
      handleRouteError("WhatsAppAiAgentController.removeKnowledge", error, next, req);
    }
  };

  resumeConversation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      await this.assertFeature(organizationId);
      const conversationId = String(req.params.conversationId || "");
      if (!conversationId) throw HttpError.badRequest("Conversation is required");

      const { whatsappAiSalesAgentService } = await import(
        "../services/whatsapp-ai-sales-agent.service.js"
      );
      const doc = await whatsappAiSalesAgentService.resumeConversation({
        organizationId,
        accountId,
        conversationId,
      });
      httpResponse(req, res, 200, "AI agent resumed", { doc });
    } catch (error) {
      handleRouteError(
        "WhatsAppAiAgentController.resumeConversation",
        error,
        next,
        req,
      );
    }
  };
}
