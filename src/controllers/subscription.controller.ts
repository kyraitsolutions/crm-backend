import { NextFunction, Request, Response } from "express";
import { handleRouteError } from "../utils/asyncHandler.js";
import { SubscriptionService } from "../services/subscription.service.js";
import httpResponse from "../utils/http.response.js";
import { HttpError } from "../utils/http.error.js";
import { SUBSCRIPTION_ERROR } from "../constants/subscription.constant.js";

export class SubscriptionController {
  private subscriptionService: SubscriptionService;
  constructor() {
    this.subscriptionService = new SubscriptionService();
  }

  private orgId(req: Request): string {
    const organizationId = String(req.user?.organizationId || "");
    if (!organizationId) {
      throw HttpError.forbidden(
        "Organization is required",
        undefined,
        SUBSCRIPTION_ERROR.SUBSCRIPTION_NOT_FOUND,
      );
    }
    return organizationId;
  }

  async getCurrent(req: Request, res: Response, next: NextFunction) {
    try {
      const snapshot = await this.subscriptionService.getSnapshot(this.orgId(req));
      httpResponse(req, res, 200, "Subscription fetched successfully", {
        doc: snapshot,
      });
    } catch (error) {
      handleRouteError("SubscriptionController", error, next, req);
    }
  }

  async getPlans(req: Request, res: Response, next: NextFunction) {
    try {
      const plans = await this.subscriptionService.getPublicPlans();
      httpResponse(req, res, 200, "Plans fetched successfully", {
        docs: plans,
      });
    } catch (error) {
      handleRouteError("SubscriptionController", error, next, req);
    }
  }

  async getAllSubscription(req: Request, res: Response, next: NextFunction) {
    return this.getPlans(req, res, next);
  }

  async checkout(req: Request, res: Response, next: NextFunction) {
    try {
      const { planId, interval } = req.body || {};
      const result = await this.subscriptionService.checkout(
        this.orgId(req),
        String(planId),
        interval === "yearly" ? "yearly" : "monthly",
      );
      httpResponse(req, res, 200, "Checkout created successfully", {
        doc: result,
      });
    } catch (error) {
      handleRouteError("SubscriptionController", error, next, req);
    }
  }

  async verifyPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const snapshot = await this.subscriptionService.verifyPayment(this.orgId(req), {
        razorpay_order_id: req.body.razorpay_order_id,
        razorpay_payment_id: req.body.razorpay_payment_id,
        razorpay_signature: req.body.razorpay_signature,
      });
      httpResponse(req, res, 200, "Payment verified successfully", {
        doc: snapshot,
      });
    } catch (error) {
      handleRouteError("SubscriptionController", error, next, req);
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const snapshot = await this.subscriptionService.cancel(this.orgId(req));
      httpResponse(req, res, 200, "Subscription cancellation scheduled", {
        doc: snapshot,
      });
    } catch (error) {
      handleRouteError("SubscriptionController", error, next, req);
    }
  }

  async acknowledgeExpiration(req: Request, res: Response, next: NextFunction) {
    try {
      const snapshot = await this.subscriptionService.acknowledgeExpirationPrompt(
        this.orgId(req),
      );
      httpResponse(req, res, 200, "Expiration prompt acknowledged", {
        doc: snapshot,
      });
    } catch (error) {
      handleRouteError("SubscriptionController", error, next, req);
    }
  }

  async getPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.subscriptionService.getPayments(this.orgId(req));
      httpResponse(req, res, 200, "Payments fetched successfully", result);
    } catch (error) {
      handleRouteError("SubscriptionController", error, next, req);
    }
  }

  async razorpayWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const signature = String(req.headers["x-razorpay-signature"] || "");
      const rawBody =
        (req as any).rawBody ||
        (Buffer.isBuffer(req.body) ? req.body : JSON.stringify(req.body || {}));
      const result = await this.subscriptionService.handleRazorpayWebhook(
        rawBody,
        signature,
      );
      httpResponse(req, res, 200, "Webhook processed", { doc: result });
    } catch (error) {
      handleRouteError("SubscriptionController", error, next, req);
    }
  }
}
