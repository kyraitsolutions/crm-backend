import { NextFunction, Request, Response } from "express";
import { ChatBotService } from "../services/chat-bot.service.js";
import { CreateChatBotDto, ResponseChatBotDto } from "../dtos/index.js";
import httpResponse from "../utils/http.response.js";
import { WebSocketServer, WebSocket } from "ws";

export class ChatBotController {
  private chatBotService: ChatBotService;
  constructor() {
    this.chatBotService = new ChatBotService();
  }

  async getChatBot(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const user = req.user as any;
      const chatbots = await this.chatBotService.getAllChatBotsByUserId(
        user.id,
      );
      httpResponse(req, res, 200, "Chatbot fetched successfully", {
        docs: chatbots,
        limit: 10,
        skip: 0,
        count: chatbots.length,
      });
    } catch (error) {
      next(error);
    }
  }

  async getChatBotById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { accountId, chatbotId } = req.params;
      const chatbot = await this.chatBotService.getChatBotById(
        accountId,
        chatbotId,
      );

      httpResponse(req, res, 200, "Chatbot details fetched successfully", {
        docs: chatbot,
      });
    } catch (error) {
      next(error);
    }
  }

  async getChatBots(req: Request, res: Response, next: NextFunction) {
    try {
      const accountId = req.params.accountId;
      const query = {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 10,
        search: req.query.search?.toString(),
      };

      const result = await this.chatBotService.getChatBots(accountId, query);
      httpResponse(req, res, 200, "Chatbot fetched successfully", result);
    } catch (error) {
      next(error);
    }
  }

  async createChatBot(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as any;
      const accountId = req.params.accountId;
      const chatBot = await this.chatBotService.createChatBot(
        user.id,
        accountId,
        req.body,
      );
      httpResponse(req, res, 201, "Chatbot Created successfully", {
        docs: chatBot,
      });
    } catch (error) {
      next(error);
    }
  }

  async getChatbotFlowById(req: Request, res: Response, next: NextFunction) {
    try {
      const { accountId, chatbotId } = req.params;

      const chatbotFlow = await this.chatBotService.getChatBotFlowById(
        accountId,
        chatbotId,
      );

      httpResponse(req, res, 200, "Chatbot flow fetched successfully", {
        doc: chatbotFlow,
      });
    } catch (error) {
      next(error);
    }
  }

  async getChatBotWithFlow(req: Request, res: Response, next: NextFunction) {
    try {
      const { accountId, chatbotId } = req.params;

      const chatBotsWithFlow = await this.chatBotService.getChatBotWithFlow(
        accountId,
        chatbotId,
      );

      httpResponse(req, res, 200, "Chatbot fetched successfully", {
        doc: chatBotsWithFlow,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateChatBot(req: Request, res: Response, next: NextFunction) {
    try {
      const { accountId, chatbotId } = req.params;
      const updateChatBotDto = new CreateChatBotDto(req.body);
      const chatBot = await this.chatBotService.updateChatBot(
        accountId,
        chatbotId,
        updateChatBotDto,
      );
      httpResponse(req, res, 200, "Chatbot Updated successfully", {
        docs: new ResponseChatBotDto(chatBot),
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteChatBot(req: Request, res: Response, next: NextFunction) {
    try {
      const { accountId, chatbotId } = req.params;

      const result = await this.chatBotService.deleteChatBot(
        accountId,
        chatbotId,
      );
      httpResponse(req, res, 200, "Chatbot Deleted successfully", {
        status: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ws event handlers
  static async getAllChatBotMessages(
    data: any,
    ws: WebSocket,
    wss: WebSocketServer,
  ) {
    const messageArr = [];
    messageArr.push(data);
    const payload = {
      event: "chat:messages",
      data: messageArr,
    };

    wss.clients.forEach((client) => {
      if (client.readyState === ws.OPEN) {
        client.send(JSON.stringify(payload));
      }
    });
  }
}
