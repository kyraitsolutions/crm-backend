import { Request, Response, NextFunction } from "express";
import httpResponse from "../utils/http.response.js";
import { CreateFormDto } from "../dtos/form.dto.js";
import { FormService } from "../services/form.service.js";

export class FormController {
  private formService: FormService;

  constructor() {
    this.formService = new FormService();
  }

  createForm = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const user = req.user as any;
      const accountId = req.params.accountId;
      const createFormDto = new CreateFormDto(req.body);
      const result = await this.formService.createForm(
        user.id,
        accountId,
        createFormDto,
      );
      httpResponse(req, res, 201, "Form created successfully", {
        docs: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getForms = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const user = req.user as any;
      const accountId = req.params.accountId;

      const forms = await this.formService.getForms(user.id, accountId);
      httpResponse(req, res, 200, "Forms fetched successfully", {
        docs: forms,
        limit: 10,
        skip: 0,
      });
    } catch (error) {
      next(error);
    }
  };

  getFormById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const user = req.user as any;
      const { accountId, formId } = req.params;
      const form = await this.formService.getFormById(
        user.id,
        accountId,
        formId,
      );
      httpResponse(req, res, 200, "Form details fetched successfully", {
        docs: form,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteFormId = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const user = req.user as any;
      const { accountId, formId } = req.params;
      const form = await this.formService.deleteFormById(
        user.id,
        accountId,
        formId,
      );
      httpResponse(req, res, 200, "Forms Deleted successfully", {
        docs: form,
      });
    } catch (error) {
      next(error);
    }
  };

  updateFormById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;
      const { accountId, formId } = req.params;
      const form = await this.formService.updateFormById(
        user.id,
        accountId,
        formId,
        req.body,
      );
      httpResponse(req, res, 200, "Form Updated successfully", {
        docs: form,
      });
    } catch (error) {
      next(error);
    }
  };
}
