import { NextFunction, Request, Response } from "express";
import { handleRouteError } from "../utils/asyncHandler.js";
import { chatflowService } from "../container.js";
import httpResponse from "../utils/http.response.js";
import { CreateChatFlowDto } from "../dtos/chatflow.dto.js";
import { routeParam } from "../utils/route-param.js";

export class ChatFlowController {
  async createChatbotFlow(req: Request, res: Response, next: NextFunction) {
    try {
      const accountId = routeParam(req.params.accountId);
      const userId = req.user?.id;
      const orgId = req.user?.organizationId;

      const createChatbotFlowDto = new CreateChatFlowDto({
        accountId: accountId,
        nodes: req.body.nodes,
        edges: req.body.edges,
        name: req.body.name,
        createdBy: String(userId),
        organizationId: String(orgId),
        status: req.body.status,
      });

      const chatbotFlow = await chatflowService.createChatFlow(
        accountId,
        createChatbotFlowDto,
      );

      return httpResponse(
        req,
        res,
        201,
        `Chat flow ${req.body.status} successfully`,
        {
          doc: chatbotFlow,
        },
      );
    } catch (error) {
      handleRouteError("ChatFlowController", error, next, req);
      return;
    }
  }

  async getAllChatFlowByAccountId(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const accountId = routeParam(req.params.accountId);
      const query = {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 5,
        search: req.query.search?.toString(),
      };
      const result = await chatflowService.getAllChatFlowByAccountId(
        accountId,
        query,
      );

      httpResponse(req, res, 200, "Chat flow fetched successfully", result);
    } catch (error) {
      handleRouteError("ChatFlowController", error, next, req);
    }
  }

  async getChatFlowById(req: Request, res: Response, next: NextFunction) {
    try {
      const accountId = routeParam(req.params.accountId);
      const chatflowId = routeParam(req.params.chatflowId);
      // const user = req.user as { id: string };

      const chatbotFlow = await chatflowService.getChatFlowById(
        accountId,
        chatflowId,
      );

      httpResponse(req, res, 200, "Chat flow fetched successfully", {
        doc: chatbotFlow,
      });
    } catch (error) {
      handleRouteError("ChatFlowController", error, next, req);
    }
  }

  async updateChatFlow(req: Request, res: Response, next: NextFunction) {
    try {
      const chatflowId = routeParam(req.params.chatflowId);

      const createChatbotFlowDto = {
        ...req.body,
      };

      const chatbotFlow = await chatflowService.updateChatFlow(
        chatflowId,
        createChatbotFlowDto,
      );

      httpResponse(req, res, 200, "Chat flow updated successfully", {
        doc: chatbotFlow,
      });
    } catch (error) {
      handleRouteError("ChatFlowController", error, next, req);
    }
  }

  async deleteChatFlowById(req: Request, res: Response, next: NextFunction) {
    try {
      const chatflowId = routeParam(req.params.chatflowId);

      const chatbotFlow = await chatflowService.deleteChatFlow(chatflowId);

      httpResponse(req, res, 200, "Chat flow deleted successfully", {
        doc: chatbotFlow,
      });
    } catch (error) {
      handleRouteError("ChatFlowController", error, next, req);
    }
  }
}
