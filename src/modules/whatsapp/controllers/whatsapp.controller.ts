import { Request, Response } from "express";
import httpResponse from "../../../utils/http.response";
import { WhatsAppService } from "../services/whatsapp.service";
import { RegisterPhoneNumberDto } from "../dtos/whatsapp.dto";

export class WhatsAppController {
  constructor(private service = new WhatsAppService()) {}

  registerPhoneNumber = async (req: Request, res: Response) => {
    const registerPhoneNumberDtoPayload = new RegisterPhoneNumberDto(req.body);

    const result = await this.service.registerPhoneNumber(
      registerPhoneNumberDtoPayload,
    );

    httpResponse(req, res, 200, "Phone number registered", result);
  };
}
