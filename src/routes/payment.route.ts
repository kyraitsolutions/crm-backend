import { Router } from "express";
import { PaymentController } from "../controllers/payment.controller.js";
import { AuthMiddleware } from "../middleware/auth.middleware.js";

export class PaymentRouter {
  private router: Router;
  private paymentController: PaymentController;

  constructor() {
    this.router = Router();
    this.paymentController = new PaymentController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.post(
      "/create-order",
      AuthMiddleware.authenticate,
      this.paymentController.createOrder.bind(this.paymentController),
      // '/create-order', this.paymentController.createOrder.bind(this.paymentController)
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}
