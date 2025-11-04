import { Request, Response, NextFunction } from "express";
import httpResponse from "../utils/http.response";
import { CreateFormDto } from "../dtos/form.dto";
import { FormService } from "../services/form.service";



export class FormController {
    // Controller methods will go here
    private formService: FormService;

    constructor() {
        this.formService = new FormService();
    }

    createForm = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const user = req.user as any;
            const createFormDto = new CreateFormDto(req.body);
            const result = await this.formService.createForm(user.id, createFormDto);
            httpResponse(req, res, 201, "Form created successfully", {
                docs: result,
            });
        } catch (error) {
            next(error);
        }
    };

    // getForms = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    //     try {
    //         const user = req.user as any;
    //         const forms = await this.formService.getForms(user.id);
    //         httpResponse(req, res, 200, "Forms fetched successfully", {
    //             docs: forms,
    //             limit: 10,
    //             skip: 0,
    //         });
    //     }
    //     catch (error) {
    //         next(error);
    //     }
    // };
}