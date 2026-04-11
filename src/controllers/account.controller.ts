import { Request, Response, NextFunction } from "express";
import httpResponse from "../utils/http.response.js";
import { AccountService } from "../services/account.service.js";
import { CreateAccountDto } from "../dtos/account.dto.js";

export class AccountController {
  private accountService: AccountService;

  constructor() {
    this.accountService = new AccountService();
  }

  getAccounts = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const user = req.user;

      const accounts = await this.accountService.getAllAccounts(user);

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
      const result = await this.accountService.getAccountById(accountId);

      httpResponse(req, res, 200, "Account fetched successfully", {
        doc: result,
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

      const result = await this.accountService.createAccount(
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
      const result = await this.accountService.deleteAccount(id, req.user);
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
