import { NextFunction, Request, Response } from "express";
import { handleRouteError } from "../../../../utils/asyncHandler.js";
import httpResponse from "../../../../utils/http.response.js";
import { HttpError } from "../../../../utils/http.error.js";
import {
  asEntityId,
  buildRequestContext,
} from "../../../../utils/request-context.utils.js";
import {
  CreateWhatsAppCampaignDto,
  TestWhatsAppCampaignDto,
  UpdateWhatsAppOptInDto,
} from "../dtos/broadcast.dto.js";
import { whatsappBroadcastService } from "../services/whatsapp-broadcast.service.js";

export class WhatsAppBroadcastController {
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
      const doc = await whatsappBroadcastService.getContext(organizationId, accountId);
      httpResponse(req, res, 200, "Broadcast context", { doc });
    } catch (error) {
      handleRouteError("WhatsAppBroadcastController.context", error, next, req);
    }
  };

  overview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      const result = await whatsappBroadcastService.overview(organizationId, accountId);
      httpResponse(req, res, 200, "WhatsApp marketing overview", { doc: result });
    } catch (error) {
      handleRouteError("WhatsAppBroadcastController.overview", error, next, req);
    }
  };

  templates = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { accountId } = this.orgAccount(req);
      const docs = await whatsappBroadcastService.listMarketingTemplates(accountId);
      httpResponse(req, res, 200, "Marketing templates", { docs });
    } catch (error) {
      handleRouteError("WhatsAppBroadcastController.templates", error, next, req);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      const result = await whatsappBroadcastService.listCampaigns(
        organizationId,
        accountId,
        req.query as any,
      );
      httpResponse(req, res, 200, "Campaigns fetched", result);
    } catch (error) {
      handleRouteError("WhatsAppBroadcastController.list", error, next, req);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const context = buildRequestContext(req, req.params.accountId);
      const dto = new CreateWhatsAppCampaignDto(req.body);
      const doc = await whatsappBroadcastService.createCampaign(
        {
          organizationId: String(context.organizationId),
          accountId: String(context.accountId),
          userId: String(context.userId),
        },
        dto,
      );
      httpResponse(req, res, 200, "Campaign created", { doc });
    } catch (error) {
      handleRouteError("WhatsAppBroadcastController.create", error, next, req);
    }
  };

  getOne = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      const campaign = await whatsappBroadcastService.getCampaign(
        organizationId,
        accountId,
        req.params.id,
      );
      httpResponse(req, res, 200, "Campaign fetched", { doc: campaign.toJSON() });
    } catch (error) {
      handleRouteError("WhatsAppBroadcastController.getOne", error, next, req);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      const doc = await whatsappBroadcastService.updateCampaign(
        organizationId,
        accountId,
        req.params.id,
        req.body,
      );
      httpResponse(req, res, 200, "Campaign updated", { doc });
    } catch (error) {
      handleRouteError("WhatsAppBroadcastController.update", error, next, req);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      const doc = await whatsappBroadcastService.deleteCampaign(
        organizationId,
        accountId,
        req.params.id,
      );
      httpResponse(req, res, 200, "Campaign deleted", { doc });
    } catch (error) {
      handleRouteError("WhatsAppBroadcastController.remove", error, next, req);
    }
  };

  previewAudience = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      const doc = await whatsappBroadcastService.previewAudience(
        organizationId,
        accountId,
        req.body?.audience || req.body || {},
        req.body?.excludeOptedOut !== false,
      );
      httpResponse(req, res, 200, "Audience preview", { doc });
    } catch (error) {
      handleRouteError("WhatsAppBroadcastController.previewAudience", error, next, req);
    }
  };

  send = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      const doc = await whatsappBroadcastService.queueCampaign(
        organizationId,
        accountId,
        req.params.id,
        { sendNow: true },
      );
      httpResponse(req, res, 200, "Campaign queued", { doc });
    } catch (error) {
      handleRouteError("WhatsAppBroadcastController.send", error, next, req);
    }
  };

  schedule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      const doc = await whatsappBroadcastService.queueCampaign(
        organizationId,
        accountId,
        req.params.id,
        {
          sendNow: false,
          scheduledAt: req.body.scheduledAt,
          timezone: req.body.timezone,
        },
      );
      httpResponse(req, res, 200, "Campaign scheduled", { doc });
    } catch (error) {
      handleRouteError("WhatsAppBroadcastController.schedule", error, next, req);
    }
  };

  pause = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      const doc = await whatsappBroadcastService.pauseCampaign(
        organizationId,
        accountId,
        req.params.id,
      );
      httpResponse(req, res, 200, "Campaign paused", { doc });
    } catch (error) {
      handleRouteError("WhatsAppBroadcastController.pause", error, next, req);
    }
  };

  cancel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      const doc = await whatsappBroadcastService.cancelCampaign(
        organizationId,
        accountId,
        req.params.id,
      );
      httpResponse(req, res, 200, "Campaign canceled", { doc });
    } catch (error) {
      handleRouteError("WhatsAppBroadcastController.cancel", error, next, req);
    }
  };

  resend = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const context = buildRequestContext(req, req.params.accountId);
      const doc = await whatsappBroadcastService.resendCampaign(
        {
          organizationId: String(context.organizationId),
          accountId: String(context.accountId),
          userId: String(context.userId),
        },
        req.params.id,
      );
      httpResponse(req, res, 200, "Campaign resent", { doc });
    } catch (error) {
      handleRouteError("WhatsAppBroadcastController.resend", error, next, req);
    }
  };

  analytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      const doc = await whatsappBroadcastService.campaignAnalytics(
        organizationId,
        accountId,
        req.params.id,
      );
      httpResponse(req, res, 200, "Campaign analytics", { doc });
    } catch (error) {
      handleRouteError("WhatsAppBroadcastController.analytics", error, next, req);
    }
  };

  recipients = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      const result = await whatsappBroadcastService.listRecipients(
        organizationId,
        accountId,
        req.params.id,
        req.query as any,
      );
      httpResponse(req, res, 200, "Recipients fetched", result);
    } catch (error) {
      handleRouteError("WhatsAppBroadcastController.recipients", error, next, req);
    }
  };

  test = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      const dto = new TestWhatsAppCampaignDto({
        ...req.body,
        campaignId: req.params.id || req.body.campaignId,
      });
      const doc = await whatsappBroadcastService.sendTest(organizationId, accountId, dto);
      httpResponse(req, res, 200, "Test message sent", { doc });
    } catch (error) {
      handleRouteError("WhatsAppBroadcastController.test", error, next, req);
    }
  };

  getOptIn = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      const doc = await whatsappBroadcastService.getOptInSettings(
        organizationId,
        accountId,
      );
      httpResponse(req, res, 200, "Opt-in settings", { doc });
    } catch (error) {
      handleRouteError("WhatsAppBroadcastController.getOptIn", error, next, req);
    }
  };

  updateOptIn = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      const dto = new UpdateWhatsAppOptInDto(req.body);
      const doc = await whatsappBroadcastService.updateOptInSettings(
        organizationId,
        accountId,
        dto,
      );
      httpResponse(req, res, 200, "Opt-in settings updated", { doc });
    } catch (error) {
      handleRouteError("WhatsAppBroadcastController.updateOptIn", error, next, req);
    }
  };
}
