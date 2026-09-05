import { Request, Response, NextFunction } from "express";
import { SubscriptionService } from "../services/subscription.service.js";
import { BILLING_ROLES, USAGE_METRIC } from "../constants/subscription.constant.js";
import { HttpError } from "../utils/http.error.js";

const subscriptionService = new SubscriptionService();

function getOrganizationId(req: Request): string {
  const organizationId = String(req.user?.organizationId || "");
  if (!organizationId) {
    throw HttpError.forbidden("Organization is required");
  }
  return organizationId;
}

export const requireBillingAccess = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  try {
    const roleName = String(req.user?.role?.name || "").toUpperCase();
    if (!BILLING_ROLES.includes(roleName as (typeof BILLING_ROLES)[number])) {
      throw HttpError.forbidden("Only organization owners and admins can manage billing");
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const requireProductAccess = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await subscriptionService.assertProductAccess(getOrganizationId(req));
    next();
  } catch (error) {
    next(error);
  }
};

export const checkSubscriptionStatus = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const organizationId =
      String(req.user?.organizationId || "") ||
      (req.user?.id
        ? undefined
        : undefined);

    if (!req.user?.organizationId) {
      throw HttpError.forbidden("Organization is required");
    }

    await subscriptionService.checkLimit(String(organizationId), USAGE_METRIC.ACCOUNTS);
    next();
  } catch (error) {
    next(error);
  }
};
