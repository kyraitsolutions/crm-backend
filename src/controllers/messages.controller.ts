import { NextFunction, Request, Response } from "express";
import { MessageService } from "../services/messages.service.js";
import httpResponse from "../utils/http.response.js";

export class MessageController {
  private messageService: MessageService;

  constructor() {
    this.messageService = new MessageService();
  }

  public async getMessagesByConversationId(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { conversationId } = req.params;
      const result =
        await this.messageService.getMessagesByConversationId(conversationId);
      httpResponse(req, res, 200, "Messages fetched successfully", {
        doc: result,
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async saveMessage(req: Request, res: Response) {
    try {
      const result = await this.messageService.saveMessage(req.body);

      httpResponse(req, res, 200, "Message saved successfully", {
        doc: result,
      });
    } catch (error: any) {
      res.status(500).json({success: false,message: error.message});
    }
  }
}
