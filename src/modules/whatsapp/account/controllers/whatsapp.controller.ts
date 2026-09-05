import { Request, Response } from "express";
import httpResponse from "../../../../utils/http.response.js";
import { RegisterPhoneNumberDto } from "../dtos/whatsapp.dto.js";
import { WhatsAppService } from "../services/whatsapp.service.js";

export class WhatsappAccountController {
  constructor(private service = new WhatsAppService()) {}

  registerPhoneNumber = async (req: Request, res: Response) => {
    const registerPhoneNumberDtoPayload = new RegisterPhoneNumberDto(req.body);

    const result = await this.service.registerPhoneNumber(
      registerPhoneNumberDtoPayload,
    );

    httpResponse(req, res, 200, "Phone number registered", result);
  };

  async syncContacts(req: Request, res: Response) {
    const { accountId } = req.params;
    // const orgId = req?.user?.organizationId;

    const result = await this.service.syncContacts(accountId);

    httpResponse(req, res, 200, "Contacts synced successfully", result);
  }
}
