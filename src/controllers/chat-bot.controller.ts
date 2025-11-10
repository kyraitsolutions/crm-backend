import { NextFunction, Request, Response } from "express";
import { ChatBotService } from "../services";
import { CreateChatBotDto } from "../dtos";
import httpResponse from "../utils/http.response";
import { WebSocketServer, WebSocket } from "ws";
import { ChatbotFlowModel } from "../models/chatbot.model";
import logger from "../utils/logger";

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
      console.log("aaua");
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
      const { accountId, chatbotId } = req.params;

      const chatbot = await this.chatBotService.getChatBotById(
        user.id,
        accountId,
        chatbotId
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
      const user = req.user as any;
      const accountId = req.params.accountId;
      const chatBots = await this.chatBotService.getChatBots(
        user.id,
        accountId
      );
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
      const createChatBotDto = new CreateChatBotDto(req.body);
      const chatBot = await this.chatBotService.createChatBot(
        user.id,
        accountId,
        req.body
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
      const user = req.user as any;
      const { accountId, chatbotId } = req.params;
      const updateChatBotDto = new CreateChatBotDto(req.body);
      const chatBot = await this.chatBotService.updateChatBot(
        user.id,
        accountId,
        chatbotId,
        updateChatBotDto
      );
      httpResponse(req, res, 200, "Chatbot Updated successfully", {
        docs: chatBot,
      });
    } catch (error) {
      next(error);
    }
  }
  // async updateChatBotStatus(req:Request,res:Response,next:NextFunction){
  //   try {

  //   } catch (error) {
  //     next(error)
  //   }
  // }
  async deleteChatBot(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as any;
      const { accountId, chatbotId } = req.params;

      const result = await this.chatBotService.deleteChatBot(
        user.id,
        accountId,
        chatbotId
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
