import { NextFunction, Request, Response } from "express";
import { chatflowService } from "../container.js";
import httpResponse from "../utils/http.response.js";
import { CreateChatFlowDto } from "../dtos/chatflow.dto.js";

export class ChatFlowController {
  async createChatbotFlow(req: Request, res: Response, next: NextFunction) {
    try {
      const { accountId } = req.params;
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
      next(error);
      return;
    }
  }

  async getAllChatFlowByAccountId(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { accountId } = req.params;
      const result = await chatflowService.getAllChatFlowByAccountId(accountId);

      httpResponse(req, res, 200, "Chat flow fetched successfully", result);
    } catch (error) {
      next(error);
    }
  }

  async getChatFlowById(req: Request, res: Response, next: NextFunction) {
    try {
      const { accountId, chatflowId } = req.params;
      // const user = req.user as { id: string };

      const chatbotFlow = await chatflowService.getChatFlowById(
        accountId,
        chatflowId,
      );

      httpResponse(req, res, 200, "Chat flow fetched successfully", {
        doc: chatbotFlow,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateChatFlow(req: Request, res: Response, next: NextFunction) {
    try {
      const { chatflowId } = req.params;

      const createChatbotFlowDto = {
        ...req.body,
      };

      const chatbotFlow = await chatflowService.updateChatFlow(
        chatflowId,
        createChatbotFlowDto,
      );

      return httpResponse(req, res, 200, "Chat flow updated successfully", {
        doc: chatbotFlow,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteChatFlowById(req: Request, res: Response, next: NextFunction) {
    try {
      const { chatflowId } = req.params;

      const chatbotFlow = await chatflowService.deleteChatFlow(chatflowId);

      return httpResponse(req, res, 200, "Chat flow deleted successfully", {
        doc: chatbotFlow,
      });
    } catch (error) {
      next(error);
    }
  }
}
