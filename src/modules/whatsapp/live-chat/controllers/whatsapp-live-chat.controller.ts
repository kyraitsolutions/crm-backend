import { NextFunction, Request, Response } from "express";
import { handleRouteError } from "../../../../utils/asyncHandler.js";
import httpResponse from "../../../../utils/http.response.js";
import { HttpError } from "../../../../utils/http.error.js";
import { asEntityId } from "../../../../utils/request-context.utils.js";
import { UpdateWhatsAppLiveChatDto } from "../dtos/live-chat.dto.js";
import { whatsappLiveChatService } from "../services/whatsapp-live-chat.service.js";

export class WhatsAppLiveChatController {
  private orgAccount(req: Request) {
    const organizationId = asEntityId(req.user?.organizationId);
    const accountId = String(req.params.accountId || "");
    if (!organizationId || !accountId) {
      throw HttpError.forbidden("Organization and account are required");
    }
    return { organizationId, accountId };
  }

  context = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      const doc = await whatsappLiveChatService.getContext(
        organizationId,
        accountId,
      );
      httpResponse(req, res, 200, "Live chat settings", { doc });
    } catch (error) {
      handleRouteError("WhatsAppLiveChatController.context", error, next, req);
    }
  };

  getSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      const doc = await whatsappLiveChatService.getSettings(
        organizationId,
        accountId,
      );
      httpResponse(req, res, 200, "Live chat settings fetched", { doc });
    } catch (error) {
      handleRouteError(
        "WhatsAppLiveChatController.getSettings",
        error,
        next,
        req,
      );
    }
  };

  updateSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      const dto = new UpdateWhatsAppLiveChatDto(req.body || {});
      const doc = await whatsappLiveChatService.updateSettings(
        organizationId,
        accountId,
        dto,
      );
      httpResponse(req, res, 200, "Live chat settings saved", { doc });
    } catch (error) {
      handleRouteError(
        "WhatsAppLiveChatController.updateSettings",
        error,
        next,
        req,
      );
    }
  };

  resumeConversation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      const conversationId = String(req.params.conversationId || "");
      if (!conversationId) throw HttpError.badRequest("Conversation is required");

      const doc = await whatsappLiveChatService.resumeConversation({
        organizationId,
        accountId,
        conversationId,
      });
      httpResponse(req, res, 200, "Auto resolve resumed", { doc });
    } catch (error) {
      handleRouteError(
        "WhatsAppLiveChatController.resumeConversation",
        error,
        next,
        req,
      );
    }
  };

  claimIntervention = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      const conversationId = String(req.params.conversationId || "");
      if (!conversationId) throw HttpError.badRequest("Conversation is required");
      if (!req.user?.id) throw HttpError.unauthorized("Unauthorized");

      const doc = await whatsappLiveChatService.claimIntervention({
        organizationId,
        accountId,
        conversationId,
        userId: String(req.user.id),
        name: req.user.name,
        email: req.user.email,
      });
      const message =
        doc?.status === "request_sent"
          ? "Intervention requested. Waiting for the teammate to accept."
          : "Intervention claimed";
      httpResponse(req, res, 200, message, { doc });
    } catch (error) {
      handleRouteError(
        "WhatsAppLiveChatController.claimIntervention",
        error,
        next,
        req,
      );
    }
  };

  acceptIntervention = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      const conversationId = String(req.params.conversationId || "");
      if (!conversationId) throw HttpError.badRequest("Conversation is required");
      if (!req.user?.id) throw HttpError.unauthorized("Unauthorized");

      const doc = await whatsappLiveChatService.acceptIntervention({
        organizationId,
        accountId,
        conversationId,
        userId: String(req.user.id),
      });
      httpResponse(req, res, 200, "Intervention request accepted", { doc });
    } catch (error) {
      handleRouteError(
        "WhatsAppLiveChatController.acceptIntervention",
        error,
        next,
        req,
      );
    }
  };
}
