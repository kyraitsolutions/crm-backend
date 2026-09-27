import { NextFunction, Request, Response } from "express";
import { FEATURE } from "../../../constants/subscription.constant.js";
import { SubscriptionService } from "../../../services/subscription.service.js";
import { handleRouteError } from "../../../utils/asyncHandler.js";
import { HttpError } from "../../../utils/http.error.js";
import httpResponse from "../../../utils/http.response.js";
import { asEntityId } from "../../../utils/request-context.utils.js";
import { ExecuteAiAgentToolDto } from "../dtos/ai-agent-tools.dto.js";
import { aiAgentService } from "../services/ai-agent.service.js";
import { callCustomApi } from "../tools/services/custom-api.service.js";
import { aiToolExecutorService } from "../tools/services/tool-executor.service.js";
import { aiToolRegistry } from "../tools/services/tool-registry.service.js";

export class AiAgentToolsController {
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
      const useDraft = String(req.query.useDraft || "") === "true";
      const { config, usingDraft } = await aiAgentService.loadRuntimeVersion(
        organizationId,
        accountId,
        useDraft,
      );
      const enabled = aiToolRegistry.forAgent(config).map((tool) =>
        aiToolRegistry.serialize(tool),
      );
      httpResponse(req, res, 200, "AI agent tools fetched", {
        doc: {
          usingDraft,
          catalog: aiToolRegistry.listCatalog(),
          enabled,
        },
      });
    } catch (error) {
      handleRouteError("AiAgentToolsController.list", error, next, req);
    }
  };

  execute = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      await this.assertFeature(organizationId);
      const dto = new ExecuteAiAgentToolDto(req.body || {});
      const { config, usingDraft } = await aiAgentService.loadRuntimeVersion(
        organizationId,
        accountId,
        dto.useDraft,
      );
      const result = await aiToolExecutorService.execute(dto.key, dto.args, {
        organizationId,
        accountId,
        userMessage: String(dto.args.query || ""),
        conversationId: dto.conversationId,
        contactId: dto.contactId,
        leadId: dto.leadId,
        phone: dto.phone,
        contactName: dto.contactName,
        knowledgeSourceIds: config.knowledgeSourceIds || [],
        dryRun: dto.dryRun,
        agentConfig: config,
      });
      httpResponse(req, res, 200, "AI agent tool executed", {
        doc: { usingDraft, result },
      });
    } catch (error) {
      handleRouteError("AiAgentToolsController.execute", error, next, req);
    }
  };

  test = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = this.orgAccount(req);
      await this.assertFeature(organizationId);
      const body = (req.body || {}) as Record<string, unknown>;
      const result = await callCustomApi({
        method: String(body.method || "GET"),
        endpoint: String(body.endpoint || ""),
        headers: (body.headers || {}) as Record<string, string>,
        params: (body.params || {}) as Record<string, string>,
        authType: String(body.authType || "none"),
        authToken: String(body.authToken || ""),
      });
      httpResponse(req, res, 200, "Custom API tested", { doc: result });
    } catch (error) {
      handleRouteError("AiAgentToolsController.test", error, next, req);
    }
  };
}
