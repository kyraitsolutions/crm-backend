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

    console.log(this);

    const result = await this.service.syncContacts(accountId);

    httpResponse(req, res, 200, "Contacts synced successfully", result);
  }
}

// onUserMessage(convId):
//   cancelPendingJobs(convId)   // remove existing 20s/4m/10m jobs from BullMQ
//   scheduleJob(convId, delay=20_000,  stage='nudge_1')
//   scheduleJob(convId, delay=240_000, stage='nudge_2')
//   scheduleJob(convId, delay=600_000, stage='nudge_3')

// processJob(convId, stage):
//   conv = loadConversation(convId)
//   if conv.status in ['closed', 'human_handoff', 'opted_out']: return
//   if conv.lastMessageAt > job.scheduledAt: return  // stale, user already replied
//   sendReengagementMessage(conv, stage)
