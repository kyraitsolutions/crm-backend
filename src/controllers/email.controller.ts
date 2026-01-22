import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger.js";
import httpResponse from "../utils/http.response.js";
import { EmailService } from "../services/email.service.js";

// TBD

export class EmailController {

    private emailService: EmailService;
    constructor() {
        this.emailService = new EmailService()
    }

    verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const email = req.query.email;
            if (!email) {
                res.status(400).json({ error: 'email query parameter is required' });
            }
            // generate a 6 digit token to verify email

            // const result=await axios.get(`https://emailreputation.abstractapi.com/v1/?api_key=4f21a69f99274f85b9c322ab9b06e058&email=${email}`);
            // const data=result?.data?.email_deliverability;

            logger.info(`This is the email ${email}`);
            httpResponse(req, res, 200, "Email verified successfully", {
                // status: data?.status==="deliverable"? true:false, <---- this one
                status: true,
            });
        } catch (error) {
            next(error);
        }
    }

    startEmailCampaign = async (req: Request, res: Response, next: NextFunction) => {
        try {
            // const user = req.user as any;
            const { accountId } = req.params;
            const { leadIds, subject, html } = req.body;

            await this.emailService.startCampaign({
                accountId,
                leadIds,
                subject,
                html,
                fromEmail:"kyraitsolutions"
            });

            httpResponse(req, res, 200, "Campaign setup successfully", {
                status: true,
                totalLeads: leadIds.length,
            });
        } catch (error) {
            next(error)
        }
    }
}