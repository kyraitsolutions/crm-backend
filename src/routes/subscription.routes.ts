import { Router } from "express";
import { subscriptionController } from "../controllers";

export class SubscriptionRouter {
  public router: Router;
  private subscriptionController: subscriptionController;

  constructor() {
    this.router = Router();
    this.subscriptionController = new subscriptionController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.post(
      "/register",
      this.subscriptionController.register.bind(this.subscriptionController)
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}
