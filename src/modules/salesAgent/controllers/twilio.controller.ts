import { Request, NextFunction, Response } from "express";
import httpResponse from "../../../utils/http.response.js";
import { TwilioService } from "../services/twilio.service.js";

export class TwilioController {
    constructor(
        private twilioService = new TwilioService(),
    ) { }

    twilio = async (req: Request, res: Response, next: NextFunction) => {
        try {
            console.log("twilio");

            httpResponse(req, res, 201, "Twilio controller", {
                doc: "response",
            });
        } catch (error) {
            console.log(error)
            next(error);
        }
    };

    makeCall = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {accountId, customerPhone, guestId, hotelName } = req.body;

            const result = await this.twilioService.makeCall({
                accountId,
                customerPhone,
            });
            httpResponse(req, res, 201, "Twilio is calling now", {
                doc: result,
            });
        } catch (error) {
            next(error);
        }
    };


    incomingCall = async (req: Request, res: Response, next: NextFunction) => {
        try {
            console.log("twilio incomming",req.body);
            const payload=req.body;
            const response = await this.twilioService.incomingCall(payload)
            // httpResponse(req, res, 201, "Twilio controller", {
            //     doc:response,
            // });
            console.log(response)
            res.setHeader("Content-Type", "text/xml");
            // return res.status(200).send(response);
            httpResponse(req, res, 201, "Twilio is calling now", {
                doc: "result",
            });
        } catch (error) {
            console.log(error)
            next(error);
        }
    };

    // twilio.controller.ts
    gatherCallInformation = async (req: Request, res: Response, next: NextFunction) => {
        try {
            console.log("twilio gather", req.body);
            const speechResult = req.body.SpeechResult;
            const response = await this.twilioService.gatherCallInformation(speechResult);
            res.setHeader("Content-Type", "text/xml");
            return res.status(200).send(response);
        } catch (error) {
            console.log(error);
            next(error);
        }
    };

    callStatus = async (req: Request, res: Response, next: NextFunction) => {
        try {
            console.log("twilio status", req.body);

            httpResponse(req, res, 201, "Twilio controller", {
                doc: "response",
            });
        } catch (error) {
            console.log(error)
            next(error);
        }
    };

    getCalls=async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {accountId}=req.query
            console.log("twilio calls", accountId);
            
            httpResponse(req, res, 201, "Calls fetched successfully", {
                doc: "response",
            });
        } catch (error) {
            console.log(error)
            next(error);
        }
    };
    getAvailableNumbers=async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {accountId,countryCode}=req.query
            console.log("twilio calls", accountId,countryCode);

            const response= await this.twilioService.getAvailableNumbers(String(countryCode));
            
            httpResponse(req, res, 201, "Avialable numbers fetched successfully", {
                docs: response,
            });
        } catch (error) {
            console.log(error)
            next(error);
        }
    };
    getMyNumbers=async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {accountId}=req.body;
            console.log("twilio calls", accountId);
            const response=await this.twilioService.getMyNumbers(accountId);
            httpResponse(req, res, 201, "My numbers fetched successfully", {
                docs: response,
            });
        } catch (error) {
            console.log(error)
            next(error);
        }
    };
    getNumberDetails=async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {accountId,phoneNumberSID}=req.body;
            console.log("twilio calls", accountId);
            const response=await this.twilioService.getNumberDetails(accountId,phoneNumberSID);
            httpResponse(req, res, 201, "Number details fetched successfully", {
                doc: response,
            });
        } catch (error) {
            console.log(error)
            next(error);
        }
    };
    purchaseNumber=async (req: Request, res: Response, next: NextFunction) => {
        try {
            const{phoneNumber,accountId}=req.body;
            console.log("twilio calls", accountId);
            
            const response=await this.twilioService.puchaseNumber(accountId,phoneNumber);
            console.log(response);
            httpResponse(req, res, 201, "Number purchased successfully", {
                doc: response,
            });
        } catch (error) {
            console.log(error)
            next(error);
        }
    };
}