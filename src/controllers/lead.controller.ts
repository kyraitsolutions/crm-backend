import { Request, Response, NextFunction } from "express";
import httpResponse from "../utils/http.response.js";
import { LeadService } from "../services/lead.service.js";
import { WebSocketServer } from "ws";
import { WEBSOCKET_EVENTS } from "../constants/wsEvent.constants.js";
import { AuthenticatedWebSocket } from "../types/websocket.type.js";

export class LeadController {
  private leadService: LeadService;

  constructor() {
    this.leadService = new LeadService();
  }

  getLeads = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = req.user as any;
      const { accountId } = req.params;

      // Separate pagination params (limit, skip) from filter criteria
      const rawFilters = { ...req.query };
      const limit = rawFilters.rowPerPage
        ? parseInt(String(rawFilters.rowPerPage), 10)
        : 10;
      const skip = (Math.max(Number(rawFilters.pageIndex), 1) - 1) * limit;

      // Remove pagination params from filter object
      delete rawFilters.rowPerPage;
      delete rawFilters.pageIndex;

      // Use filters only for querying (status, stage, etc.), not for pagination
      const response = await this.leadService.getLeads(
        user.id,
        accountId,
        rawFilters,
        { limit, skip }
      );


      httpResponse(req, res, 200, "Leads fetched successfully", {
        docs: response?.leads,
        pagination: {
          limit,
          skip,
          total: response?.leads.length,
          totalDocs: response?.totalDocs,
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

      const lead = await this.leadService.updateLead(
        accountId,
        leadId,
        leadData
      );
      httpResponse(req, res, 200, "Lead updated successfully", lead);
    } catch (error) {
      next(error);
    }
  };

  createLeadWs = async (ws: AuthenticatedWebSocket, wss: WebSocketServer, data: any) => {
    try {
      // const leadData = {
      //   accountId: new mongoose.Types.ObjectId(data.accountId),
      //   name: data.name,
      //   email: data?.email || "",
      //   phone: data?.phone || "",
      //   customFields: data?.customFields || {},
      //   source: {
      //     name: data.source.name,
      //     url: data.source.url,
      //     chatbotId: new mongoose.Types.ObjectId(data.source.chatbotId),
      //   },

      //   stage: "Intake",
      //   status: "Active",
      // };

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
            })
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
              })
            );
          }
        });
      }
    }
    return null;
  };

  updateLeadWs = async (ws: AuthenticatedWebSocket, wss: WebSocketServer, data: any) => {
    try {
      const lead = await this.leadService.updateLeadWs(data);

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
            })
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
              })
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
        leadId
      );

      httpResponse(req, res, 200, "Lead summary fetched successfully", { data: leadSummary });
    } catch (error) {
      next(error)
    }
  }
}
