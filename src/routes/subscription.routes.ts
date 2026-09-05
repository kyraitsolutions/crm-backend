import { Router } from "express";
import { SubscriptionController } from "../controllers/subscription.controller.js";
import { AuthMiddleware } from "../middleware/auth.middleware.js";
import { requireBillingAccess } from "../middleware/subscription.middleware.js";

export class SubscriptionRouter {
  public router: Router;
  private subscriptionController: SubscriptionController;

  constructor() {
    this.router = Router();
    this.subscriptionController = new SubscriptionController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.post(
      "/razorpay/webhook",
      this.subscriptionController.razorpayWebhook.bind(this.subscriptionController),
    );

    this.router.get(
      "/plans",
      AuthMiddleware.authenticate,
      this.subscriptionController.getPlans.bind(this.subscriptionController),
    );

    this.router.get(
      "/",
      AuthMiddleware.authenticate,
      this.subscriptionController.getCurrent.bind(this.subscriptionController),
    );

    this.router.get(
      "/payments",
      AuthMiddleware.authenticate,
      requireBillingAccess,
      this.subscriptionController.getPayments.bind(this.subscriptionController),
    );

    this.router.post(
      "/checkout",
      AuthMiddleware.authenticate,
      requireBillingAccess,
      this.subscriptionController.checkout.bind(this.subscriptionController),
    );

    this.router.post(
      "/payment/verify",
      AuthMiddleware.authenticate,
      requireBillingAccess,
      this.subscriptionController.verifyPayment.bind(this.subscriptionController),
    );

    this.router.post(
      "/cancel",
      AuthMiddleware.authenticate,
      requireBillingAccess,
      this.subscriptionController.cancel.bind(this.subscriptionController),
    );

    this.router.post(
      "/expiration-prompt/acknowledge",
      AuthMiddleware.authenticate,
      this.subscriptionController.acknowledgeExpiration.bind(
        this.subscriptionController,
      ),
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}
