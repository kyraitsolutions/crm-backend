import {Request,Response, NextFunction } from "express";
import httpResponse from "../utils/http.response";
import { recyclebinService } from "../container";


export class RecyclebinController {
  list = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
    //   const user = req.user;
      const { accountId } = req.params;
      const recyclebins = await recyclebinService.list(accountId);

      httpResponse(req, res, 200, "Accounts fetched successfully", {
        docs: recyclebins,
        limit: 10,
        skip: 0,
      });
    } catch (error) {
      next(error);
    }
  };

}