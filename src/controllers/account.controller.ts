import { NextFunction, Request, Response } from "express";
import { handleRouteError } from "../utils/asyncHandler.js";
import { accountService } from "../container.js";
import { CreateAccountDto } from "../dtos/account.dto.js";
import { TUser } from "../types/user.type.js";
import httpResponse from "../utils/http.response.js";
import { TRole } from "../types/roles-permissions.type.js";

export class AccountController {
  getAccounts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      const role = req.user?.role as TRole;
      const result = await accountService.getAllAccounts(user as TUser, role);

      httpResponse(req, res, 200, "Accounts fetched successfully", result);
    } catch (error) {
      handleRouteError("AccountController", error, next, req);
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

      httpResponse(req, res, 200, "Account fetched successfully", result);
    } catch (error) {
      handleRouteError("AccountController", error, next, req);
    }
  };

  getAccountAccess = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const userId = req?.user?.id;
      const role = req?.user?.role;
      const { accountId } = req.params;

      const result = await accountService.getAccountAccess(
        userId as string,
        accountId,
        role?.name as string,
      );

      httpResponse(
        req,
        res,
        200,
        "Account access fetched successfully",
        result,
      );
    } catch (error) {
      handleRouteError("AccountController", error, next, req);
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

      httpResponse(req, res, 201, "Account created successfully", result);
    } catch (error) {
      handleRouteError("AccountController", error, next, req);
    }
  };

  deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id;
      const result = await accountService.deleteAccount(id);
      httpResponse(req, res, 200, "Account deleted successfully", result);
    } catch (error) {
      handleRouteError("AccountController", error, next, req);
    }
  };

  updateAccount = async () => {
    return {};
  };
}
