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
      "/susbcribe",
      this.subscriptionController.getAllSubscription.bind(this.subscriptionController)
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}
