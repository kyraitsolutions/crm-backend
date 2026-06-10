import { Request, Response, NextFunction } from "express";
import httpResponse from "../utils/http.response.js";
import { LeadService } from "../services/lead.service.js";
import { WebSocketServer } from "ws";
import { WEBSOCKET_EVENTS } from "../constants/wsEvent.constants.js";
import { AuthenticatedWebSocket } from "../types/websocket.type.js";
import { EmailService } from "../services/email.service.js";
import { AccountModel } from "../models/accounts.model.js";
import { getMetaData } from "../utils/request-meta.utils.js";
import { LeadDto } from "../dtos/lead.dto.js";

export class LeadController {
  private leadService: LeadService;
  private emailService: EmailService;

  constructor() {
    this.leadService = new LeadService();
    this.emailService = new EmailService();
  }

  getLeads = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const user = req.user as any;
      const { accountId } = req.params;

      const payload=req.body;

      const limit = req.body.limit
        ? Number(req.body.limit)
        : 10;

      const page =Math.max(Number(payload.page),1);
      const skip = (Math.max(Number(page), 1) - 1) * limit;


      const [leads,totalDocs] = await this.leadService.getLeads(user.id,accountId,payload,skip);

      const totalPages = Math.ceil(totalDocs /limit) || 1;


      // console.log(leads,totalDocs)

      httpResponse(req, res, 200, "Leads fetched successfully", {
        docs: leads,
        pagination: {
          page,
          limit,
          skip,
          totalDocs:totalDocs,
          totalPages:totalPages,
          hasNextPage:
              page <
              totalPages,
            hasPrevPage:
              page > 1,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  updateLead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { accountId, leadId } = req.params;
      const leadData = req.body;

      console.log("Updating lead", { accountId, leadId, leadData });
      const lead = await this.leadService.updateLead(
        accountId,
        leadId,
        leadData,
      );
      httpResponse(req, res, 200, "Lead updated successfully", lead);
    } catch (error) {
      next(error);
    }
  };

  getLead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { accountId, leadId } = req.params;
      console.log("AccountId:", accountId, "LeadId:", leadId);
      const lead = await this.leadService.getLead(accountId, leadId);

      console.log("Fetched lead:", lead);
      httpResponse(req, res, 200, "Lead fetched successfully", 
        {
          doc:lead,
        });
    } catch (error) {
      next(error);
    }
  };

  // createLead = async (req: Request, res: Response, next: NextFunction) => {
  //   try {
  //     const { accountId, formId } = req.params;
  //     const leadData = req.body;

  //     const lead = await this.leadService.createLead({
  //       ...leadData,
  //       accountId: accountId,
  //       source: {
  //         name: "webform",
  //         url: "https://www.google.com",
  //         formId: formId,
  //       },
  //     });
  //     httpResponse(req, res, 200, "Lead create successfully", lead);
  //   } catch (error) {
  //     next(error);
  //   }
  // };
  createWebhookLead = async (req: Request, res: Response, next: NextFunction) => {
    try {

      console.log(req.params)


      const { accountId } = req.params;
      const meta=await getMetaData(req);

      // console.log("accountId", accountId);
      const leadData = req.body;

      const leadDto=new LeadDto(leadData);

      console.log("leadDto", leadDto);

      const lead = await this.leadService.createLead({
        ...leadDto,
        accountId: accountId,
        source: {
          ...leadDto.source,
          name: "webhook",
          url: "https://www.google.com",
        },
        meta:{
          ...meta,
          location:{
            ...meta.location,
            address:leadData.address,
            country:leadData.country,
            city:leadData.city
          }

        },
      });
      httpResponse(req, res, 200, "Lead create successfully", lead);
    } catch (error) {
      next(error);
    }
  };

  createLeadWs = async (
    ws: AuthenticatedWebSocket,
    wss: WebSocketServer,
    data: any,
  ) => {
    try {
      const lead = await this.leadService.createLeadWs(data);

      wss.clients.forEach((client) => {
        if (client.readyState === ws.OPEN && ws.accountId === data?.accountId) {
          client.send(
            JSON.stringify({
              event: WEBSOCKET_EVENTS["Chatbot Lead Created"],
              data: {
                lead: {
                  ...lead.toObject(),
                },
              },
            }),
          );
        }
      });
    } catch (error) {
      if (error) {
        wss.clients.forEach((client) => {
          if (client.readyState === ws.OPEN) {
            client.send(
              JSON.stringify({
                event: "error",
                data: error,
              }),
            );
          }
        });
      }
    }
    return null;
  };

  updateLeadWs = async (
    ws: AuthenticatedWebSocket,
    wss: WebSocketServer,
    data: any,
  ) => {
    try {
      const lead = await this.leadService.updateLeadWs(data);

      if (lead?.name && lead.phone && lead.email) {
        const account = await AccountModel.findOne({
          _id: lead.accountId,
        });

        const leadPayload = {
          ...lead,
          accountName: account?.accountName,
          supportEmail: account?.email,
        };

        console.log("leadPayload", leadPayload);

        this.emailService.queueLeadAcknowledgementEmail(
          leadPayload?.email as string,
          leadPayload,
        );
      }

      wss.clients.forEach((client) => {
        if (client.readyState === ws.OPEN) {
          client.send(
            JSON.stringify({
              event: WEBSOCKET_EVENTS["Chatbot Lead Updated"],
              data: {
                lead: {
                  ...lead,
                },
              },
            }),
          );
        }
      });
    } catch (error) {
      if (error) {
        wss.clients.forEach((client) => {
          if (client.readyState === ws.OPEN) {
            client.send(
              JSON.stringify({
                event: "error",
                data: error,
              }),
            );
          }
        });
      }
    }
    return null;
  };

  getLeadSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { accountId, leadId } = req.params;
      const leadSummary = await this.leadService.getLeadSummary(
        accountId,
        leadId,
      );

      httpResponse(req, res, 200, "Lead summary fetched successfully", {
        data: leadSummary,
      });
    } catch (error) {
      next(error);
    }
  };
}
