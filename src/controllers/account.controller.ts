import { NextFunction, Request, Response } from "express";
import { accountService } from "../container.js";
import { CreateAccountDto } from "../dtos/account.dto.js";
import { TUser } from "../types/user.type.js";
import httpResponse from "../utils/http.response.js";

export class AccountController {
  getAccounts = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const user = req.user;
      const accounts = await accountService.getAllAccounts(user as TUser);

      httpResponse(req, res, 200, "Accounts fetched successfully", {
        docs: accounts,
        limit: 10,
        skip: 0,
      });
    } catch (error) {
      next(error);
    }
  };

  getAccountById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { accountId } = req.params;
      const result = await accountService.getAccountById(accountId);

      httpResponse(req, res, 200, "Account fetched successfully", {
        doc: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getAccountAccess = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req?.user?.id;
      const role = req?.user?.role;
      const { accountId } = req.params;

      const data = await accountService.getAccountAccess(
        userId as string,
        accountId,
        role?.name as string,
      );

      httpResponse(req, res, 200, "Account access fetched successfully", {
        doc: data,
      });
    } catch (error) {
      next(error);
    }
  };

  createAccount = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const user = req.user;
      const createAccountDto = new CreateAccountDto(req.body);

      const result = await accountService.createAccount(
        user?.id as string,
        user?.organizationId as string,
        createAccountDto,
      );

      httpResponse(req, res, 201, "Account created successfully", {
        docs: result,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id;
      const result = await accountService.deleteAccount(id, req.user);
      if (!result) {
        httpResponse(
          req,
          res,
          404,
          "Account with the user id does not exist!",
          {
            data: null,
          },
        );
      }
      httpResponse(req, res, 200, "Account deleted successfully", {
        data: {},
      });
    } catch (error) {
      next(error);
    }
  };

  updateAccount = async () => {
    return {};
  };
}
