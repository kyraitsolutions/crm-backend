import { Request, Response, NextFunction } from "express";
import { Plan, UserSubscription } from "../models/subscription.model.js";
import { SubscriptionStatus } from "../types/core.js";
import { ObjectId } from "mongodb";
import { AccountModel } from "../models/accounts.model.js";
import httpResponse from "../utils/http.response.js";

export const checkSubscriptionStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      httpResponse(req, res, 401, "Unauthorized");
      return;
    }

    // Get active subscription
    const sub = await UserSubscription.findOne({
      userId: new ObjectId(req.user.id),
    });

    if (!sub) {
      httpResponse(
        req,
        res,
        403,
        "No active subscription found. Please upgrade.",
      );
      return;
    }

    if (sub.expiresAt && new Date() > sub.expiresAt) {
      // Lazily expire it
      sub.status = SubscriptionStatus.EXPIRED;
      await sub.save();
      httpResponse(req, res, 403, "Subscription expired. Please renew.");
      return;
    }

    const plan = await Plan.findById({ _id: sub.planId });

    const maxAccounts = plan?.maxAccounts as number;

    const accounts = await AccountModel.countDocuments({ userId: req.user.id });

    if (accounts >= maxAccounts) {
      httpResponse(req, res, 403, "Account limit exceeded");
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
};
