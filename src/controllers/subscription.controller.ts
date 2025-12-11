import { NextFunction, Request, Response } from "express";
import { ChatBotService } from "../services";

export class SubscriptionController {
  private subscriptionService: SubscriptionService;
  constructor() {
    this.subscriptionService = new SubscriptionService();
  }
  async getSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      // const chatBots = await this.chatBotService.getChatBots();
      return res.status(200).json({
        message: "Subscription fetched successfully",
        data: [],
      });
    } catch (error) {
      next(error);
    }
  }
  async createSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const chatBot = await this.chatBotService.createSubscription(
        req.body
      );

      return res.status(201).json(chatBot);
    } catch (error) {
      next(error);
    }
  }
}
