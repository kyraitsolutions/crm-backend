import { NextFunction, Request, Response } from "express";
import { handleRouteError } from "../../../../utils/asyncHandler.js";
import httpResponse from "../../../../utils/http.response.js";
import { RegisterPhoneNumberDto } from "../dtos/whatsapp.dto.js";
import { WhatsAppService } from "../services/whatsapp.service.js";

export class WhatsappAccountController {
  constructor(private service = new WhatsAppService()) {}

  registerPhoneNumber = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const registerPhoneNumberDtoPayload = new RegisterPhoneNumberDto({
        ...req.body,
        accountId: req.body?.accountId || req.params.accountId,
      });

      const result = await this.service.registerPhoneNumber(
        registerPhoneNumberDtoPayload,
      );

      httpResponse(req, res, 200, "Phone number registered", {
        doc: result,
      });
    } catch (error) {
      handleRouteError(
        "WhatsappAccountController.registerPhoneNumber",
        error,
        next,
        req,
      );
    }
  };

  syncContacts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { accountId } = req.params;
      const result = await this.service.syncContacts(accountId);

      httpResponse(req, res, 200, "Contacts synced successfully", {
        doc: result,
      });
    } catch (error) {
      handleRouteError(
        "WhatsappAccountController.syncContacts",
        error,
        next,
        req,
      );
    }
  };
}
