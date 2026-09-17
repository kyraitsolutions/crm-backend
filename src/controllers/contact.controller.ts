import { NextFunction, Request, Response } from "express";
import { handleRouteError } from "../utils/asyncHandler.js";
import httpResponse from "../utils/http.response.js";
import { contactService } from "../container.js";

export class ContactController {
  getContacts = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { accountId, rowPerPage, pageIndex } = req.body;

      const payload = req.body;

      const limit = rowPerPage ? parseInt(String(rowPerPage), 10) : 10;

      const page = Math.max(Number(pageIndex), 1);
      const skip = (Math.max(Number(pageIndex), 1) - 1) * limit;

      const [contacts, totalDocs] = await contactService.getContacts(
        String(accountId || ""),
        payload,
        skip,
      );

      console.log(contacts);
      const totalPages = Math.ceil(contacts.totalDocs / limit) || 1;

      httpResponse(req, res, 200, "contacts fetched successfully", {
        docs: contacts,
        pagination: {
          page,
          limit,
          skip,
          totalDocs: totalDocs,
          totalPages: totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      });
    } catch (error) {
      handleRouteError("ContactController", error, next, req);
    }
  };

  createContact = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const data = req.body;

      console.log("accountId", data);
      const contact = await contactService.createContact(data);

      httpResponse(req, res, 200, "contact created successfully", {
        docs: contact,
        limit: 10,
        skip: 0,
      });
    } catch (error) {
      handleRouteError("ContactController", error, next, req);
    }
  };

  updateContact = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { accountId, contactId, ...data } = req.body || {};
      const id = String(contactId || req.params.contactId || "");
      const account = String(accountId || "");
      if (!account || !id) {
        httpResponse(req, res, 400, "accountId and contactId are required", {});
        return;
      }
      const contact = await contactService.updateContact(account, id, data);
      httpResponse(req, res, 200, "contact updated successfully", {
        docs: contact,
      });
    } catch (error) {
      handleRouteError("ContactController", error, next, req);
    }
  };
}
