import { Router } from "express";
import { SubscriptionController } from "../controllers/subscription.controller.js";

export class SubscriptionRouter {
  public router: Router;
  private subscriptionController: SubscriptionController;

  constructor() {
    this.router = Router();
    this.subscriptionController = new SubscriptionController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.get(
      "/",
      this.subscriptionController.getAllSubscription.bind(this.subscriptionController)
    );
    this.router.post(
    "/subscribe",
    this.subscriptionController.createSubscription.bind(this.subscriptionController)
  );

  this.router.post(
    "/webhook/razorpay",
    this.subscriptionController.razorpayWebhook.bind(this.subscriptionController)
  );

  this.router.post(
    "/webhook/stripe",
    this.subscriptionController.stripeWebhook.bind(this.subscriptionController)
  );
  }

  public getRouter(): Router {
    return this.router;
  }
}
