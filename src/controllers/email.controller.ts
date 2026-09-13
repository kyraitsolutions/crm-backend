import { Request, Response, NextFunction } from "express";
import { handleRouteError } from "../utils/asyncHandler.js";
import logger from "../utils/logger.js";
import httpResponse from "../utils/http.response.js";
import { EmailService } from "../services/email.service.js";
import { accountService } from "../container.js";

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
                httpResponse(req, res, 400, "email query parameter is required");
                return;
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
            handleRouteError("EmailController", error, next, req);
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
            handleRouteError("EmailController", error, next, req);
        }
    };
    getSubscribers=async(req:Request,res:Response,next:NextFunction)=>{
        try {
            const {accountId}=req.params;  
            
            const subscribers=await this.emailService.getSubscribers(accountId);
            
            httpResponse(req, res, 200, "Subscribers fetched successfully", {
                docs: subscribers,
            });

        } catch (error) {
            handleRouteError("EmailController", error, next, req);
        }
    };
    createTemplate=async(req:Request,res:Response,next:NextFunction)=>{
        try {
            const {accountId}=req.params;  
            const templateData=req.body;
            const template=await this.emailService.createTemplate(accountId,templateData);
            
            httpResponse(req, res, 200, "Template created successfully", {
                doc: template,
            });
        } catch (error) {
            handleRouteError("EmailController", error, next, req);
        }   
    };
    getTemplates=async(req:Request,res:Response,next:NextFunction)=>{
        try {
            const {accountId}=req.params;
            const templates=await this.emailService.getTemplates(accountId);

            httpResponse(req, res, 200, "Templates fetched successfully", {
                docs: templates,
            });
        } catch (error) {
            handleRouteError("EmailController", error, next, req);
        }   
    };

    sendMultipleMail=async(req:Request,res:Response,next:NextFunction)=>{
        try {
            // const user = req.user as any;
            const { accountId } = req.params;
            logger.info("Sending multiple emails", { accountId });
            const {leadId,contactId, name , emails, subject, html} = req.body;
            const result = await accountService.getAccountById(accountId);
            await this.emailService.sendMultipleEmail({
                accountId,
                leadId,
                contactId,
                name,
                emails,
                subject,
                html,
                fromEmail:result.doc.email
            });

            httpResponse(req, res, 200, "Campaign setup successfully", {
                status: true,
                totalLeads: emails.length,
            });
        } catch (error) {
            handleRouteError("EmailController", error, next, req);
        }
    }


};