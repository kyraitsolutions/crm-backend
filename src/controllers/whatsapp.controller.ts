import {Request,Response, NextFunction } from "express";
import httpResponse from "../utils/http.response";
import { whatsppService } from "../container";

export class WhatsappController {

  getContacts = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const {accountId,rowPerPage,pageIndex} = req.body;

      const limit = rowPerPage
        ? parseInt(String(rowPerPage), 10)
        : 10;
      
      const page =Math.max(Number(pageIndex),1);
      const skip = (Math.max(Number(pageIndex), 1) - 1) * limit;

      const contacts = await whatsppService.getList(String(accountId||""),{limit,skip});

      const totalPages =
        Math.ceil(
          contacts.totalDocs /
            limit
        ) || 1;
      httpResponse(req, res, 200, "contacts fetched successfully", {
        docs: contacts.docs,
        pagination: {
          page,
          limit,
          skip,
          totalDocs: contacts?.totalDocs,
          totalPages:totalPages,
          hasNextPage:
              page <
              totalPages,
            hasPrevPage:
              page > 1,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}