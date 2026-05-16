import { NextFunction, Request, Response } from "express";
import httpResponse from "../utils/http.response.js";
import { contactService } from "../container.js";

export class ContactController {

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

      const contacts = await contactService.getContacts(String(accountId||""),{limit,skip});

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
  createContact = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const data = req.body;

      console.log("accountId", data)
      const contact = await contactService.createContact(data);

      httpResponse(req, res, 200, "contact created successfully", {
        docs: contact,
        limit: 10,
        skip: 0,
      });
    } catch (error) {
      next(error);
    }
  };
}