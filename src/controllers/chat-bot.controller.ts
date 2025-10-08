import { NextFunction, Request, Response } from "express";
import { ChatBotService } from "../services";
import { CreateChatBotDto } from "../dtos";

export class ChatBotController {
  private chatBotService: ChatBotService;
  constructor() {
    this.chatBotService = new ChatBotService();
  }
  async getChatBots(req: Request, res: Response, next: NextFunction) {
    try {
      // const chatBots = await this.chatBotService.getChatBots();
      return res.status(200).json({
        message: "Chatbots fetched successfully",
        data: [],
      });
    } catch (error) {
      next(error);
    }
  }
  async createChatBot(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as any;
      const createChatBotDto = new CreateChatBotDto(req.body);
      const chatBot = await this.chatBotService.createChatBot(
        user.id,
        createChatBotDto
      );
      return res.status(201).json(chatBot);
    } catch (error) {
      next(error);
    }
  }
  async updateChatBot(req: Request, res: Response, next: NextFunction) {
    try {
      const updateChatBotDto = new CreateChatBotDto(req.body);
      const chatBotId = req.params.id;
      const user = req.user as any;
      const chatBot = await this.chatBotService.updateChatBot(
        Number(user.id),
        Number(chatBotId),
        updateChatBotDto
      );
      return res.status(200).json(chatBot);
    } catch (error) {
      next(error);
    }
  }
  async deleteChatBot(req: Request, res: Response, next: NextFunction) {
    try {
      const chatBot = await this.chatBotService.deleteChatBot();
      return res.status(200).json(chatBot);
    } catch (error) {
      next(error);
    }
  }
}
