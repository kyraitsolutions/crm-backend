import { NextFunction, Request, Response } from "express";
import { SubscriptionService } from "../services/subscription.service.js";
import httpResponse from "../utils/http.response.js";

export class SubscriptionController {
  private subscriptionService: SubscriptionService;
  constructor() {
    this.subscriptionService = new SubscriptionService();
  }
  async getAllSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const subscriptions = await this.subscriptionService.getAllSubscriptionPlan();

      // console.log(subscriptions);
      httpResponse(req, res, 200, "Subscription fetched successfully", {
        docs: subscriptions,
      });
    } catch (error) {
      next(error);
    }
  }
  // async createSubscription(req: Request, res: Response, next: NextFunction) {
  //   try {
  //     const chatBot = await this.chatBotService.createSubscription(
  //       req.body
  //     );

  //     return res.status(201).json(chatBot);
  //   } catch (error) {
  //     next(error);
  //   }
  // }
}
