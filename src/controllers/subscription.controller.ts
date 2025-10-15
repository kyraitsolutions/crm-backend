// import { NextFunction, Request, Response } from "express";
// import { ChatBotService } from "../services";
// import { CreateChatBotDto } from "../dtos";

// export class SubscriptionController {
//   private subscript: ChatBotService;
//   constructor() {
//     this.chatBotService = new ChatBotService();
//   }
//   async getSubscription(req: Request, res: Response, next: NextFunction) {
//     try {
//       // const chatBots = await this.chatBotService.getChatBots();
//       return res.status(200).json({
//         message: "Subscription fetched successfully",
//         data: [],
//       });
//     } catch (error) {
//       next(error);
//     }
//   }
//   async createSubscription(req: Request, res: Response, next: NextFunction) {
//     try {
//       const chatBot = await this.chatBotService.createSubscription(
//         req.body
//       );

//       return res.status(201).json(chatBot);
//     } catch (error) {
//       next(error);
//     }
//   }
// }
