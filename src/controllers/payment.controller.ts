import { Request, Response, NextFunction } from "express";
import httpResponse from "../utils/http.response.js";
// import { PaymentService } from "../services/payment.service.js";
import { razorpay } from "../config/razorpay.js";

export class PaymentController {
  // private paymentService: PaymentService;

  constructor() {
    // this.paymentService = new PaymentService();
  }

  createOrder = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      console.log("Request", req.body);
      const options = {
        amount: req.body.amount * 100, // amount in paise
        currency: "INR",
        receipt: "receipt_order_123",
      };

      console.log("hjkl");
      const order = await razorpay.orders.create(options);
      console.log(order);

      // res.json({
      //   success: true,
      //   order,
      // });

      // const user = req.user as any;
      // console.log("Body", req.body)

      // const data = await this.paymentService.createOrder();
      httpResponse(req, res, 200, "Order created successfully", {
        docs: order,
      });
    } catch (error) {
      console.error("RAZORPAY ERROR:", error);
      next(error);
    }
  };
}
