// controllers/conversation.controller.ts

import { NextFunction, Request, Response } from "express";
import { ConversationService } from "../services/conversations.service.js";
import httpResponse from "../utils/http.response.js";
import { InitConversationDto } from "../dtos/conversation.dot.js";
// import { TConversationQuery } from "../types/api-response.type";
import { parseQueryParams } from "../utils/query.utils.js";

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
      next(error);
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
      console.log(req.query);
      const query = parseQueryParams(req.query, {
        allowedFilters: ["platform"],
      });

      const result = await this.service.getConversationsByAccountId(accountId, {
        ...query,
      });

      httpResponse(req, res, 200, "Conversations fetched successfully", result);
    } catch (error: any) {
      next(error);
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
}
