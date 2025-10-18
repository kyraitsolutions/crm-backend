import { NextFunction, Request, Response } from "express";
import { ChatBotService } from "../services";
import { CreateChatBotDto } from "../dtos";
import httpResponse from "../utils/http.response";

export class ChatBotController {
  private chatBotService: ChatBotService;
  constructor() {
    this.chatBotService = new ChatBotService();
  }

  async getChatBot(req:Request,res:Response,next:NextFunction):Promise<void>{
    try {
      const user=req.user as any;
      const chatbots= await this.chatBotService.getAllChatBotsByUserId(user.id)
      httpResponse(req, res, 200, "Chatbot fetched successfully", {
        docs: chatbots,
        limit: 10,
        skip: 0,
        count:chatbots.length
      });
    } catch (error) {
      next(error)
    }
  }
  async getChatBots(req: Request, res: Response, next: NextFunction) {
    try {
      const user=req.user as any;
      const chatBots = await this.chatBotService.getChatBots(user.id);
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
      httpResponse(req,res,201,"Chatbot Created successfully",{
        docs:chatBot
      })
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
      httpResponse(req,res,200,"Chatbot Updated successfully",{
        docs:chatBot
      })
    } catch (error) {
      next(error);
    }
  }
  async deleteChatBot(req: Request, res: Response, next: NextFunction) {
    try {
      const chatBot = await this.chatBotService.deleteChatBot();
      httpResponse(req,res,200,"Chatbot Deleted successfully",{
        docs:chatBot
      })
    } catch (error) {
      next(error);
    }
  }
}
