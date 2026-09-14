// controllers/conversation.controller.ts

import { NextFunction, Request, Response } from "express";
import { handleRouteError } from "../utils/asyncHandler.js";
import { ConversationService } from "../services/conversations.service.js";
import httpResponse from "../utils/http.response.js";
import { InitConversationDto } from "../dtos/conversation.dot.js";
// import { TConversationQuery } from "../types/api-response.type";
import { parseQueryParams } from "../utils/query.utils.js";
import { asEntityId } from "../utils/request-context.utils.js";
import { HttpError } from "../utils/http.error.js";

export class ConversationController {
  private service: ConversationService;

  constructor() {
    this.service = new ConversationService();
  }

  async initConversation(req: Request, res: Response, next: NextFunction) {
    try {
      const conversationPayloadData = new InitConversationDto(req.body);
      const result = await this.service.initConversation(
        conversationPayloadData,
      );

      httpResponse(req, res, 200, "Conversation initialized successfully", {
        doc: result,
      });
    } catch (error) {
      handleRouteError("ConversationController", error, next, req);
    }
  }

  async getConversationById(req: Request, res: Response) {
    try {
      const result = await this.service.getConversationById(
        req.params.conversationId,
      );

      return res.status(200).json({
        success: true,
        result,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getConversationsByAccountId(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { accountId } = req.params;
      const query = parseQueryParams(req.query, {
        allowedFilters: ["platform"],
      });

      const result = await this.service.getConversationsByAccountId(accountId, {
        ...query,
      });

      httpResponse(req, res, 200, "Conversations fetched successfully", result);
    } catch (error: any) {
      handleRouteError("ConversationController", error, next, req);
    }
  }

  async getConversationByVisitor(req: Request, res: Response) {
    try {
      const result = await this.service.getConversationByVisitor(
        req.params.visitorId,
      );

      return res.status(200).json({
        success: true,
        result,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async deleteConversations(req: Request, res: Response, next: NextFunction) {
    try {
      const { accountId } = req.params;
      const conversationIds = Array.isArray(req.body?.conversationIds)
        ? req.body.conversationIds.map(String)
        : req.body?.conversationId
          ? [String(req.body.conversationId)]
          : [];
      const userId = asEntityId(req.user?.id);
      if (!userId) throw HttpError.unauthorized("Unauthorized");

      const result = await this.service.deleteConversations(
        accountId,
        conversationIds,
        {
          deleteContact: Boolean(req.body?.deleteContact),
          userId,
        },
      );

      httpResponse(req, res, 200, "Conversation moved to recycle bin", {
        doc: result,
      });
    } catch (error) {
      handleRouteError("ConversationController.deleteConversations", error, next, req);
    }
  }
}
