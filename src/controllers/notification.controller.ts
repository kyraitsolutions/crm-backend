import { NextFunction, Request, Response } from "express";
import { handleRouteError } from "../utils/asyncHandler.js";
import { notificationService } from "../container.js";
import httpResponse from "../utils/http.response.js";
import { HttpError } from "../utils/http.error.js";

export class NotificationController {
  private orgId(req: Request) {
    const organizationId = String(req.user?.organizationId || req.params.organizationId || "");
    if (!organizationId) {
      throw HttpError.forbidden("Organization is required");
    }
    return organizationId;
  }

  getNotifications = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const result = await notificationService.getAllNotifications(this.orgId(req));
      httpResponse(req, res, 200, "notifications fetched successfully", result);
    } catch (error) {
      handleRouteError("NotificationController", error, next, req);
    }
  };

  markAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const notification = await notificationService.markAsRead(
        this.orgId(req),
        String(req.params.notificationId),
      );
      httpResponse(req, res, 200, "Notification marked as read", {
        doc: notification,
      });
    } catch (error) {
      handleRouteError("NotificationController", error, next, req);
    }
  };

  markAllAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await notificationService.markAllAsRead(this.orgId(req));
      httpResponse(req, res, 200, "All notifications marked as read", {
        doc: { success: true },
      });
    } catch (error) {
      handleRouteError("NotificationController", error, next, req);
    }
  };
}
