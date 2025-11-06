import { NextFunction, Request, Response } from "express";
import { ChatBotService } from "../services";
import { CreateChatBotDto } from "../dtos";
import httpResponse from "../utils/http.response";
import { WebSocketServer, WebSocket } from "ws";
import { ChatbotFlowModel } from "../models/chatbot.model";

export class ChatBotController {
  private chatBotService: ChatBotService;
  constructor() {
    this.chatBotService = new ChatBotService();
  }

  async getChatBot(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = req.user as any;
      const chatbots = await this.chatBotService.getAllChatBotsByUserId(
        user.id
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
    next: NextFunction
  ): Promise<void> {
    try {
      const user = req.user as any;
      const chatBotId = req.params.chatbotId;
      const chatbot = await this.chatBotService.getChatBotById(
        user.id,
        chatBotId
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
      // const user=req.user as any;
      const accountId = req.params.accountId;
      const chatBots = await this.chatBotService.getChatBots(accountId);
      httpResponse(req, res, 200, "Chatbot fetched successfully", {
        docs: chatBots,
        limit: 10,
        skip: 0,
        count: chatBots.length,
      });
    } catch (error) {
      next(error);
    }
  }

  async getChatbotFlow(req: Request, res: Response, next: NextFunction) {
    try {
      // const user=req.user as any;
      const accountId = req.params.accountId;

      console.log(accountId);
      // const chatBots = await this.chatBotService.getChatbotFlow(accountId);
      httpResponse(req, res, 200, "Chatbot fetched successfully", {
        // docs: chatBots,
        // limit: 10,
        // skip: 0,
        // count: chatBots.length,
      });
    } catch (error) {
      next(error);
    }
  }

  async createChatbotFlow(req: Request, res: Response, next: NextFunction) {
    console.log("aaya");
    try {
      const accountId = req.params.accountId;
      // const createChatBotDto = new CreateChatBotDto(req.body);

      const chatbotFlowData = {
        accountId: accountId,
        nodes: req.body.nodes,
        edges: req.body.edges,
      };

      const isChatbotFlowExist = await ChatbotFlowModel.findOne({
        accountId: accountId,
      });

      if (isChatbotFlowExist) {
        await ChatbotFlowModel.updateOne(
          { accountId: accountId },
          { $set: chatbotFlowData }
        );

        return;
      }

      await ChatbotFlowModel.create(chatbotFlowData);
      httpResponse(req, res, 201, "Chatbot Created successfully", {
        // docs: chatBot,
      });
    } catch (error) {
      next(error);
    }
  }

  async createChatBot(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as any;
      
      const accountId = req.params.accountId;

      console.log("user id",user.id)
      console.log("account id",accountId)

      const createChatBotDto = new CreateChatBotDto(req.body);
      const chatBot = await this.chatBotService.createChatBot(
        user.id,
        accountId,
        createChatBotDto
      );
      httpResponse(req, res, 201, "Chatbot Created successfully", {
        docs: chatBot,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateChatBot(req: Request, res: Response, next: NextFunction) {
    try {
      const updateChatBotDto = new CreateChatBotDto(req.body);
      const chatBotId = req.params.id;
      // const user = req.user as any;
      const chatBot = await this.chatBotService.updateChatBot(
        // user.id,
        chatBotId,
        updateChatBotDto
      );
      httpResponse(req, res, 200, "Chatbot Updated successfully", {
        docs: chatBot,
      });
    } catch (error) {
      next(error);
    }
  }
  async deleteChatBot(req: Request, res: Response, next: NextFunction) {
    try {
      const chatBot = await this.chatBotService.deleteChatBot();
      httpResponse(req, res, 200, "Chatbot Deleted successfully", {
        docs: chatBot,
      });
    } catch (error) {
      next(error);
    }
  }

  // ws event handlers

  static async getAllChatBotMessages(
    data: any,
    ws: WebSocket,
    wss: WebSocketServer
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
