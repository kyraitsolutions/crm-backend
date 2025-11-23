import {Request,Response, NextFunction } from "express";
import logger from "../utils/logger";
import httpResponse from "../utils/http.response";


export class EmailController{

    verifyEmail = async(req:Request,res:Response,next:NextFunction):Promise<void>=>{
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
                status: data?.status==="deliverable"? true:false,
            });
        } catch (error) {
            next(error);
        }
    }
}