import { Request, Response, NextFunction } from "express";
import httpResponse from "../utils/http.response";
import { CreateFormDto } from "../dtos/form.dto";
import { FormService } from "../services/form.service";

export class FormController {
  private formService: FormService;

  constructor() {
    this.formService = new FormService();
  }

  createForm = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = req.user as any;
      const accountId = req.params.accountId;
      const createFormDto = new CreateFormDto(req.body);
      const result = await this.formService.createForm(
        user.id,
        accountId,
        createFormDto
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
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = req.user as any;
      const accountId = req.params.accountId;

      const forms = await this.formService.getForms(user.id, accountId);
      console.log(forms);
      httpResponse(req, res, 200, "Forms fetched successfully", {
        docs: forms,
        limit: 10,
        skip: 0,
      });
    } catch (error) {
      next(error);
    }
  };
}
