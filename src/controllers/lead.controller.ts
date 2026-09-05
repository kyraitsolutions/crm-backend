import { Request, Response, NextFunction } from "express";
import httpResponse from "../utils/http.response.js";
import { LeadService } from "../services/lead.service.js";
import { WebSocketServer } from "ws";
import { WEBSOCKET_EVENTS } from "../constants/wsEvent.constants.js";
import { AuthenticatedWebSocket } from "../types/websocket.type.js";
import { getMetaData } from "../utils/request-meta.utils.js";
import { LeadDto } from "../dtos/lead.dto.js";
import { handleRouteError } from "../utils/asyncHandler.js";
import { buildRequestContext } from "../utils/request-context.utils.js";
import { buildPagination } from "../utils/paginationBuilder.js";

export class LeadController {
  private leadService: LeadService;

  constructor() {
    this.leadService = new LeadService();
  }

  getLeads = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const user = req.user as { id: string };
      const { accountId } = req.params;
      const payload = req.body;
      const limit = payload.limit ? Number(payload.limit) : 10;
      const page = Math.max(Number(payload.page) || 1, 1);
      const skip = (page - 1) * limit;

      const [leads, totalDocs] = await this.leadService.getLeads(
        user.id,
        accountId,
        payload,
        skip,
      );

      httpResponse(req, res, 200, "Leads fetched successfully", {
        docs: leads,
        pagination: {
          ...buildPagination({
            page,
            limit,
            totalDocs,
            docsCount: Array.isArray(leads) ? leads.length : 0,
          }),
          skip,
        },
      });
    } catch (error) {
      handleRouteError("LeadController.getLeads", error, next, req);
    }
  };

  getLead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { accountId, leadId } = req.params;
      const lead = await this.leadService.getLead(accountId, leadId);

      httpResponse(req, res, 200, "Lead fetched successfully", {
        doc: lead,
      });
    } catch (error) {
      handleRouteError("LeadController.getLead", error, next, req);
    }
  };

  createBulkLead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { accountId } = req.params;
      const { leads, uniqueKey, mode } = req.body;
      const context = buildRequestContext(req, accountId);

      const result = await this.leadService.createBulkLead(
        context,
        leads,
        uniqueKey,
        mode,
      );

      httpResponse(req, res, 200, "Leads created successfully", {
        doc: result,
      });
    } catch (error) {
      handleRouteError("LeadController.createBulkLead", error, next, req);
    }
  };

  createLead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { accountId } = req.params;
      const meta = await getMetaData(req);
      const leadData = req.body;
      const leadDto = new LeadDto(leadData);

      const leadDataPayload = {
        ...leadDto,
        accountId: String(accountId),
        source: {
          ...leadDto.source,
          name: leadDto.source.name,
          url: leadDto.source.url,
        },
        meta: {
          ...meta,
          location: {
            ...meta.location,
            address: leadData.address,
            country: leadData.country,
            city: leadData.city,
          },
        },
      };

      const result = await this.leadService.createLead(
        buildRequestContext(req, accountId),
        leadDataPayload,
      );
      httpResponse(req, res, 200, "Lead created successfully", result);
    } catch (error) {
      handleRouteError("LeadController.createLead", error, next, req);
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
      handleRouteError("LeadController.createLeadWs", error, () => {
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
      });
    }
    return null;
  };

  updateLead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { accountId, leadId } = req.params;
      const result = await this.leadService.updateLead(
        accountId,
        leadId,
        req.body,
        req.user,
      );
      httpResponse(req, res, 200, "Lead updated successfully", result);
    } catch (error) {
      handleRouteError("LeadController.updateLead", error, next, req);
    }
  };

  updateLeadWs = async (
    ws: AuthenticatedWebSocket,
    wss: WebSocketServer,
    data: any,
  ) => {
    try {
      const lead = await this.leadService.updateLeadWs(data);
      await this.leadService.notifyLeadUpdated(lead);

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
      handleRouteError("LeadController.updateLeadWs", error, () => {
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
      });
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
        doc: leadSummary,
      });
    } catch (error) {
      handleRouteError("LeadController.getLeadSummary", error, next, req);
    }
  };
}
