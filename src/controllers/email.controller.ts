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


    getSubscribers=async(req:Request,res:Response,next:NextFunction)=>{
        try {
            const {accountId}=req.params;  
            
            const subscribers=await this.emailService.getSubscribers(accountId);
            
            httpResponse(req, res, 200, "Campaign setup successfully", {
                data:subscribers
            });

        } catch (error) {
            next(error)
        }
    };


    createTemplate=async(req:Request,res:Response,next:NextFunction)=>{
        try {
            const {accountId}=req.params;  
            const templateData=req.body;
            const template=await this.emailService.createTemplate(accountId,templateData);
            
            httpResponse(req, res, 200, "Template created successfully", {
                data:template
            });
        } catch (error) {
            next(error)
        }   
    };
    getTemplates=async(req:Request,res:Response,next:NextFunction)=>{
        try {
            const {accountId}=req.params;  
            const templates=await this.emailService.getTemplates(accountId);
            
            httpResponse(req, res, 200, "Template created successfully", {
                data:templates
            });
        } catch (error) {
            next(error)
        }   
    };


};