import { NextFunction, Request, Response } from "express";
import { FEATURE } from "../../../constants/subscription.constant.js";
import { SubscriptionService } from "../../../services/subscription.service.js";
import { handleRouteError } from "../../../utils/asyncHandler.js";
import { HttpError } from "../../../utils/http.error.js";
import httpResponse from "../../../utils/http.response.js";
import { asEntityId } from "../../../utils/request-context.utils.js";
import { InvokeAiAgentRuntimeDto } from "../dtos/ai-agent-runtime.dto.js";
import { aiAgentRuntimeService } from "../runtime/services/ai-agent-runtime.service.js";

export class AiAgentRuntimeController {
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

  invoke = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      await this.assertFeature(organizationId);
      const dto = new InvokeAiAgentRuntimeDto(req.body || {});
      const doc = await aiAgentRuntimeService.invoke({
        organizationId,
        accountId,
        userMessage: dto.message,
        history: dto.history,
        useDraft: dto.useDraft,
        threadId: dto.threadId || undefined,
        allowWrites: dto.allowWrites,
        contactId: dto.contactId || undefined,
        leadId: dto.leadId || undefined,
        phone: dto.phone || undefined,
        contactName: dto.contactName || undefined,
        selectionId: dto.selectionId || undefined,
      });
      httpResponse(req, res, 200, "AI agent runtime reply", { doc });
    } catch (error) {
      handleRouteError("AiAgentRuntimeController.invoke", error, next, req);
    }
  };

  listRuns = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      await this.assertFeature(organizationId);
      const threadId = String(req.query.threadId || "");
      const doc = await aiAgentRuntimeService.listRuns(
        accountId,
        threadId || undefined,
      );
      httpResponse(req, res, 200, "AI agent runtime runs fetched", { doc });
    } catch (error) {
      handleRouteError("AiAgentRuntimeController.listRuns", error, next, req);
    }
  };

  getRun = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      await this.assertFeature(organizationId);
      const runId = String(req.params.runId || "");
      if (!runId) throw HttpError.badRequest("Run is required");
      const doc = await aiAgentRuntimeService.getRun(accountId, runId);
      httpResponse(req, res, 200, "AI agent runtime run fetched", { doc });
    } catch (error) {
      handleRouteError("AiAgentRuntimeController.getRun", error, next, req);
    }
  };
}
