import {Request,Response, NextFunction } from "express";
import { UserProfileService } from "../services/userprofile.service";
import httpResponse from "../utils/http.response";
import { CreateOnboardingDto } from "../dtos/userprofile.dto";

export class UserProfileController {
    private userprofileService: UserProfileService;

    constructor() {
        this.userprofileService = new UserProfileService();
    }
    
    createOnboarding = async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const user = req.user as any;
            const createOnboardingDto = new CreateOnboardingDto(req.body);
            const result = await this.userprofileService.createOnboarding(
                user.id,
                createOnboardingDto
            );
            httpResponse(req, res, 201, "Client onbaorded successfully", {
                docs: result,
            });
        } catch (error) {
            next(error);
        }
    };
}