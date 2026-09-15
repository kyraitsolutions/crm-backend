import { NextFunction, Request, Response } from "express";
import { handleRouteError } from "../../../../utils/asyncHandler.js";
import httpResponse from "../../../../utils/http.response.js";
import { HttpError } from "../../../../utils/http.error.js";
import {
  asEntityId,
  buildRequestContext,
} from "../../../../utils/request-context.utils.js";
import { UpsertWhatsAppCannedMessageDto } from "../dtos/canned.dto.js";
import { whatsappCannedMessageService } from "../services/whatsapp-canned-message.service.js";
import { CANNED_MESSAGE_STATUS } from "../constants/canned.constant.js";

export class WhatsAppCannedMessageController {
  private orgAccount(req: Request) {
    const organizationId = asEntityId(req.user?.organizationId);
    const accountId = String(req.params.accountId || "");
    if (!organizationId || !accountId) {
      throw HttpError.forbidden("Organization and account are required");
    }
    return { organizationId, accountId };
  }

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { accountId } = this.orgAccount(req);
      const docs = await whatsappCannedMessageService.list(accountId, {
        search: String(req.query.search || ""),
        status: String(req.query.status || ""),
      });
      httpResponse(req, res, 200, "Canned messages fetched", { docs });
    } catch (error) {
      handleRouteError("WhatsAppCannedMessageController.list", error, next, req);
    }
  };

  listPublished = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { accountId } = this.orgAccount(req);
      const docs = await whatsappCannedMessageService.list(accountId, {
        status: CANNED_MESSAGE_STATUS.PUBLISHED,
      });
      httpResponse(req, res, 200, "Canned messages fetched", { docs });
    } catch (error) {
      handleRouteError(
        "WhatsAppCannedMessageController.listPublished",
        error,
        next,
        req,
      );
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.orgAccount(req);
      const context = buildRequestContext(req, accountId);
      const dto = new UpsertWhatsAppCannedMessageDto(req.body || {});
      const doc = await whatsappCannedMessageService.create(
        {
          organizationId,
          accountId,
          userId: String(context.userId),
          userName: context.userName || "Agent",
        },
        dto,
      );
      httpResponse(req, res, 200, "Canned message created", { doc });
    } catch (error) {
      handleRouteError("WhatsAppCannedMessageController.create", error, next, req);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { accountId } = this.orgAccount(req);
      const dto = new UpsertWhatsAppCannedMessageDto(req.body || {});
      const doc = await whatsappCannedMessageService.update(
        accountId,
        req.params.id,
        dto,
      );
      httpResponse(req, res, 200, "Canned message updated", { doc });
    } catch (error) {
      handleRouteError("WhatsAppCannedMessageController.update", error, next, req);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { accountId } = this.orgAccount(req);
      const doc = await whatsappCannedMessageService.remove(
        accountId,
        req.params.id,
      );
      httpResponse(req, res, 200, "Canned message deleted", { doc });
    } catch (error) {
      handleRouteError("WhatsAppCannedMessageController.remove", error, next, req);
    }
  };

  toggleFavourite = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { accountId } = this.orgAccount(req);
      const doc = await whatsappCannedMessageService.toggleFavourite(
        accountId,
        req.params.id,
      );
      httpResponse(req, res, 200, "Favourite updated", { doc });
    } catch (error) {
      handleRouteError(
        "WhatsAppCannedMessageController.toggleFavourite",
        error,
        next,
        req,
      );
    }
  };

  markUsed = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { accountId } = this.orgAccount(req);
      const doc = await whatsappCannedMessageService.markUsed(
        accountId,
        req.params.id,
      );
      httpResponse(req, res, 200, "Usage recorded", { doc });
    } catch (error) {
      handleRouteError(
        "WhatsAppCannedMessageController.markUsed",
        error,
        next,
        req,
      );
    }
  };
}
