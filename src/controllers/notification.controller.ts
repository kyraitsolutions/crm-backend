import { NextFunction, Request, Response } from "express";
import { notificationService } from "../container.js";
import httpResponse from "../utils/http.response.js";

export class NotificationController {

  getNotifications = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const {organizationId} = req.params;

      console.log("Orgid", organizationId)
      const notifications = await notificationService.getAllNotifications(String(organizationId||""));

      httpResponse(req, res, 200, "notifications fetched successfully", {
        docs: notifications,
        limit: 10,
        skip: 0,
      });
    } catch (error) {
      next(error);
    }
  };
}