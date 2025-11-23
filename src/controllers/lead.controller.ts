import { Request, Response, NextFunction } from "express";
import httpResponse from "../utils/http.response";
import { LeadService } from "../services/lead.service";
import { WebSocketServer } from "ws";
import { WEBSOCKET_EVENTS } from "../constants/wsEvent.constants";
import mongoose from "mongoose";

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
      const limit = rawFilters.limit
        ? parseInt(String(rawFilters.limit), 10)
        : 10;
      const skip = rawFilters.skip ? parseInt(String(rawFilters.skip), 10) : 0;

      // Remove pagination params from filter object
      delete rawFilters.limit;
      delete rawFilters.skip;

      // Use filters only for querying (status, stage, etc.), not for pagination

      console.log(user.id,accountId)
      const leads = await this.leadService.getLeads(
        user.id,
        accountId,
        rawFilters,
        { limit, skip }
      );

      console.log("yaha aya",leads)

      httpResponse(req, res, 200, "Leads fetched successfully", {
        docs: leads,
        total: leads.length,
        limit,
        skip,
      });
    } catch (error) {
      next(error);
    }
  };

  createLeadWs = async (ws: WebSocket, wss: WebSocketServer, data: any) => {
    try {

      console.log("sdfjshfsd=======================================",data)

      const leadData = {
          accountId: new mongoose.Types.ObjectId(data.accountId),
          name: data.name,
          email: data?.email || "",
          phone: data?.phone || "",
          customFields: data?.customFields || {},
          source: {
            name: data.source.name,
            url: data.source.url,
            chatbotId: new mongoose.Types.ObjectId(data.source.chatbotId)
          },

          stage: "Intake",
          status: "Active"
      };


      console.log("Prepare lead Payload",leadData)
      const lead = await this.leadService.createLeadWs(data);

      console.log(data);

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

  updateLeadWs = async (ws: WebSocket, wss: WebSocketServer, data: any) => {
    try {

      console.log("Data at the time of update============",data)
      const lead = await this.leadService.updateLeadWs(data);

      wss.clients.forEach((client) => {
        if (client.readyState === ws.OPEN) {
          client.send(
            JSON.stringify({
              event: WEBSOCKET_EVENTS["Chatbot Lead Updated"],
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
}
