import { NextFunction, Request, Response } from "express";
import httpResponse from "../utils/http.response.js";
import { ActivityLogService } from "../services/activityLog.service.js";
import { parseQueryParams } from "../utils/query.utils.js";

export default class ActivityLogController {
  private service = new ActivityLogService();

  getActivityLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { accountId } = req.params;
      const query = parseQueryParams(req.query);

      const result = await this.service.getActivityLogs(String(accountId), {
        ...query,
      });

      httpResponse(req, res, 200, "Activity logs fetched successfully", result);
    } catch (error) {
      next(error);
    }
  };
}
