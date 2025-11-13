import { Request, Response, NextFunction } from "express"
import httpResponse from "../utils/http.response";
import { LeadService } from "../services/lead.service";

export class LeadController {
    private leadService: LeadService;

    constructor() {
        this.leadService = new LeadService();
    }

    getLeads = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const user = req.user as any;
            const { accountId } = req.params;

            // Separate pagination params (limit, skip) from filter criteria
            const rawFilters = { ...req.query };
            const limit = rawFilters.limit ? parseInt(String(rawFilters.limit), 10) : 10;
            const skip = rawFilters.skip ? parseInt(String(rawFilters.skip), 10) : 0;

            // Remove pagination params from filter object
            delete rawFilters.limit;
            delete rawFilters.skip;

            // Use filters only for querying (status, stage, etc.), not for pagination
            const leads = await this.leadService.getLeads(user.id, accountId, rawFilters, { limit, skip });

            httpResponse(req, res, 200, "Leads fetched successfully", {
                docs: leads,
                total: leads.length,
                limit,
                skip,
            });
        } catch (error) {
            next(error);
        }
    }
}