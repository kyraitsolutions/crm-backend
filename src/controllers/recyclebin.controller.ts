import { Request, Response, NextFunction } from "express";
import { handleRouteError } from "../utils/asyncHandler.js";
import httpResponse from "../utils/http.response.js";
import { recyclebinService } from "../container.js";

export class RecyclebinController {
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { accountId } = req.params;
      const docs = await recyclebinService.list(accountId);
      httpResponse(req, res, 200, "Recycle bin fetched", { docs });
    } catch (error) {
      handleRouteError("RecyclebinController.list", error, next, req);
    }
  };

  restore = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { accountId } = req.params;
      const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(String) : [];
      const doc = await recyclebinService.restore(accountId, ids);
      httpResponse(req, res, 200, "Records restored", { doc });
    } catch (error) {
      handleRouteError("RecyclebinController.restore", error, next, req);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { accountId } = req.params;
      const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(String) : [];
      const doc = await recyclebinService.permanentDelete(accountId, ids);
      httpResponse(req, res, 200, "Records deleted permanently", { doc });
    } catch (error) {
      handleRouteError("RecyclebinController.remove", error, next, req);
    }
  };

  empty = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { accountId } = req.params;
      const doc = await recyclebinService.empty(accountId);
      httpResponse(req, res, 200, "Recycle bin emptied", { doc });
    } catch (error) {
      handleRouteError("RecyclebinController.empty", error, next, req);
    }
  };
}
