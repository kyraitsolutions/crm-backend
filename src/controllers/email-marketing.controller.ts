import { NextFunction, Request, Response } from "express";
import { handleRouteError } from "../utils/asyncHandler.js";
import httpResponse from "../utils/http.response.js";
import { emailMarketingService } from "../services/email-marketing.service.js";
import { buildRequestContext } from "../utils/request-context.utils.js";
import { HttpError } from "../utils/http.error.js";
import { asEntityId } from "../utils/request-context.utils.js";

export class EmailMarketingController {
  private orgAccount(req: Request) {
    const organizationId = asEntityId(req.user?.organizationId);
    const accountId = String(req.params.accountId || "");
    if (!organizationId || !accountId) {
      throw HttpError.forbidden("Organization and account are required");
    }
    return { organizationId, accountId };
  }

  overview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      const result = await emailMarketingService.overview(organizationId, accountId);
      httpResponse(req, res, 200, "Email marketing overview", { doc: result });
    } catch (error) {
      handleRouteError("EmailMarketingController.overview", error, next, req);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      const result = await emailMarketingService.listCampaigns(
        organizationId,
        accountId,
        req.query as any,
      );
      httpResponse(req, res, 200, "Campaigns fetched", result);
    } catch (error) {
      handleRouteError("EmailMarketingController.list", error, next, req);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const context = buildRequestContext(req, req.params.accountId);
      const doc = await emailMarketingService.createCampaign(
        {
          organizationId: String(context.organizationId),
          accountId: String(context.accountId),
          userId: String(context.userId),
        },
        req.body,
      );
      httpResponse(req, res, 200, "Campaign created", { doc });
    } catch (error) {
      handleRouteError("EmailMarketingController.create", error, next, req);
    }
  };

  getOne = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      const campaign = await emailMarketingService.getCampaign(
        organizationId,
        accountId,
        req.params.id,
      );
      httpResponse(req, res, 200, "Campaign fetched", { doc: campaign.toJSON() });
    } catch (error) {
      handleRouteError("EmailMarketingController.getOne", error, next, req);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      const doc = await emailMarketingService.updateCampaign(
        organizationId,
        accountId,
        req.params.id,
        req.body,
      );
      httpResponse(req, res, 200, "Campaign updated", { doc });
    } catch (error) {
      handleRouteError("EmailMarketingController.update", error, next, req);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      const doc = await emailMarketingService.deleteCampaign(
        organizationId,
        accountId,
        req.params.id,
      );
      httpResponse(req, res, 200, "Campaign deleted", { doc });
    } catch (error) {
      handleRouteError("EmailMarketingController.remove", error, next, req);
    }
  };

  previewAudience = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      const doc = await emailMarketingService.previewAudience(
        organizationId,
        accountId,
        req.body || {},
      );
      httpResponse(req, res, 200, "Audience preview", { doc });
    } catch (error) {
      handleRouteError("EmailMarketingController.previewAudience", error, next, req);
    }
  };

  send = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      const doc = await emailMarketingService.queueCampaign(
        organizationId,
        accountId,
        req.params.id,
        { sendNow: true },
      );
      httpResponse(req, res, 200, "Campaign queued", { doc });
    } catch (error) {
      handleRouteError("EmailMarketingController.send", error, next, req);
    }
  };

  schedule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      const doc = await emailMarketingService.queueCampaign(
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
      handleRouteError("EmailMarketingController.schedule", error, next, req);
    }
  };

  pause = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      const doc = await emailMarketingService.pauseCampaign(
        organizationId,
        accountId,
        req.params.id,
      );
      httpResponse(req, res, 200, "Campaign paused", { doc });
    } catch (error) {
      handleRouteError("EmailMarketingController.pause", error, next, req);
    }
  };

  cancel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      const doc = await emailMarketingService.cancelCampaign(
        organizationId,
        accountId,
        req.params.id,
      );
      httpResponse(req, res, 200, "Campaign canceled", { doc });
    } catch (error) {
      handleRouteError("EmailMarketingController.cancel", error, next, req);
    }
  };

  analytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      const doc = await emailMarketingService.campaignAnalytics(
        organizationId,
        accountId,
        req.params.id,
      );
      httpResponse(req, res, 200, "Campaign analytics", { doc });
    } catch (error) {
      handleRouteError("EmailMarketingController.analytics", error, next, req);
    }
  };

  recipients = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      const result = await emailMarketingService.listRecipients(
        organizationId,
        accountId,
        req.params.id,
        req.query as any,
      );
      httpResponse(req, res, 200, "Recipients fetched", result);
    } catch (error) {
      handleRouteError("EmailMarketingController.recipients", error, next, req);
    }
  };

  test = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      const doc = await emailMarketingService.sendTest(
        organizationId,
        accountId,
        req.params.id,
        req.body.to,
      );
      httpResponse(req, res, 200, "Test email sent", { doc });
    } catch (error) {
      handleRouteError("EmailMarketingController.test", error, next, req);
    }
  };

  templates = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      const docs = await emailMarketingService.listTemplates(accountId, organizationId);
      httpResponse(req, res, 200, "Templates fetched", { docs });
    } catch (error) {
      handleRouteError("EmailMarketingController.templates", error, next, req);
    }
  };

  createTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const context = buildRequestContext(req, req.params.accountId);
      const doc = await emailMarketingService.createTemplate(
        String(context.accountId),
        String(context.organizationId),
        req.body,
        String(context.userId),
      );
      httpResponse(req, res, 200, "Template created", { doc });
    } catch (error) {
      handleRouteError("EmailMarketingController.createTemplate", error, next, req);
    }
  };

  updateTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { accountId } = this.orgAccount(req);
      const doc = await emailMarketingService.updateTemplate(
        accountId,
        req.params.templateId,
        req.body,
      );
      httpResponse(req, res, 200, "Template updated", { doc });
    } catch (error) {
      handleRouteError("EmailMarketingController.updateTemplate", error, next, req);
    }
  };

  deleteTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { accountId } = this.orgAccount(req);
      const doc = await emailMarketingService.deleteTemplate(
        accountId,
        req.params.templateId,
      );
      httpResponse(req, res, 200, "Template deleted", { doc });
    } catch (error) {
      handleRouteError("EmailMarketingController.deleteTemplate", error, next, req);
    }
  };

  duplicateTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { accountId } = this.orgAccount(req);
      const doc = await emailMarketingService.duplicateTemplate(
        accountId,
        req.params.templateId,
      );
      httpResponse(req, res, 200, "Template duplicated", { doc });
    } catch (error) {
      handleRouteError("EmailMarketingController.duplicateTemplate", error, next, req);
    }
  };

  suppression = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = this.orgAccount(req);
      const result = await emailMarketingService.listSuppression(
        organizationId,
        req.query as any,
      );
      httpResponse(req, res, 200, "Suppression list", result);
    } catch (error) {
      handleRouteError("EmailMarketingController.suppression", error, next, req);
    }
  };

  addSuppression = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = this.orgAccount(req);
      const doc = await emailMarketingService.addSuppression(
        organizationId,
        req.body.email,
        req.body.reason,
      );
      httpResponse(req, res, 200, "Email suppressed", { doc });
    } catch (error) {
      handleRouteError("EmailMarketingController.addSuppression", error, next, req);
    }
  };

  sesWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body;
      if (body?.Type === "SubscriptionConfirmation" && body.SubscribeURL) {
        try {
          await fetch(body.SubscribeURL);
        } catch {
          // SNS retries if confirmation fetch fails; still ack the webhook.
        }
        httpResponse(req, res, 200, "SNS subscription noted", { doc: { ok: true } });
        return;
      }
      const message = typeof body?.Message === "string" ? JSON.parse(body.Message) : body;
      const notificationType = message?.notificationType || message?.eventType;
      const mail = message?.mail;
      const eventType =
        notificationType === "Bounce" || notificationType === "bounce"
          ? "BOUNCED"
          : notificationType === "Complaint" || notificationType === "complaint"
            ? "COMPLAINED"
            : notificationType === "Delivery" || notificationType === "delivery"
              ? "DELIVERED"
              : notificationType === "Open" || notificationType === "open"
                ? "OPENED"
                : notificationType === "Click" || notificationType === "click"
                  ? "CLICKED"
                  : String(notificationType || "").toUpperCase();
      await emailMarketingService.handleProviderEvent({
        eventType,
        email: mail?.destination?.[0] || message?.bounce?.bouncedRecipients?.[0]?.emailAddress,
        messageId: mail?.messageId,
        providerEventId: String(body?.MessageId || `${mail?.messageId || "ses"}:${eventType}`),
        metadata: message,
      });
      httpResponse(req, res, 200, "Webhook processed", { doc: { ok: true } });
    } catch (error) {
      handleRouteError("EmailMarketingController.sesWebhook", error, next, req);
    }
  };
}
