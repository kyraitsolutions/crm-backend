// analytics.controller.ts
import { Request, Response, NextFunction } from "express";
import AnalyticsService from "../services/analytics.service.js";
import httpResponse from "../utils/http.response.js";

export default class AnalyticsController {
    private analyticsService: AnalyticsService;
    
    constructor() {
        this.analyticsService = new AnalyticsService();
    }

    getOverview = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = req.user as any;
            const { accountId } = req.params;
            const query = req.query; // you may accept range filters here

            const analytics = await this.analyticsService.getFullAnalytics(user, accountId, query);
            httpResponse(req, res, 200, "Analytics fetched", { data: analytics });
        } catch (err) {
            next(err);
        }
    };
    getSearch = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { accountId } = req.params;
            const {query} = req.query; // you may accept range filters here
            const result = await this.analyticsService.getSearch(accountId, query);
            httpResponse(req, res, 200, "Global search result fetched", { docs: result });
        } catch (err) {
            next(err);
        }
    };
}
