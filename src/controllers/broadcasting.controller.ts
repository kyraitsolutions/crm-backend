import { Request, Response, NextFunction } from "express";
import httpResponse from "../utils/http.response.js";
import { BroadcastService } from "../services/broadcast.service.js";

export class BroadcastController {

    private broadcastService: BroadcastService;
    constructor() {
        this.broadcastService = new BroadcastService()
    }

    
    startEmailCampaign = async (req: Request, res: Response, next: NextFunction) => {
        try {
            // const user = req.user as any;
            const { accountId } = req.params;
            const { leadIds, subject, html } = req.body;

            await this.broadcastService.startCampaign({
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
    };
}