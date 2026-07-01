import { Request,Response,NextFunction } from "express";
import { LeadService } from "../../../services/lead.service.js";
import { getMetaData } from "../../../utils/request-meta.utils.js";
import { LeadDto } from "../../../dtos/lead.dto.js";
import httpResponse from "../../../utils/http.response.js";
import { WebhookService } from "../service/webhook.service.js";

export class WebhookController {
    constructor(
        private leadService = new LeadService(),
        private webhookService=new WebhookService()
    ) { }

    generateToken = async (req: Request,res: Response,next: NextFunction) => {
        try {
            const { accountId } = req.params;
            
            const {response,msg}=await this.webhookService.createToken({
                accountId,
                organizationId: String(req.user?.organizationId||""),
                createdBy: req.user?.id||"",
            });
            httpResponse(req, res, 201, msg, {
                doc:response,
            });
        } catch (error) {
            console.log(error)
            next(error);
        }
    };
    getToken = async (req: Request,res: Response,next: NextFunction) => {
        try {
            const { accountId } = req.params;
            
            const response=await this.webhookService.getToken({
                accountId,
                organizationId: String(req.user?.organizationId||""),
            });
            httpResponse(req, res, 201,"Token details fetched successfully", {
                doc:response,
            });
        } catch (error) {
            console.log(error)
            next(error);
        }
    };

    

    createWebhookLead = async (req: Request,res: Response,next: NextFunction) => {
        try {
            console.log(req.user);
            const { accountId } = req.params;
            const meta = await getMetaData(req);

            const leadData = req.body;
            const leadDto = new LeadDto(leadData);

            const leadDataPayload = {
                ...leadDto,
                accountId: String(accountId),
                source: {
                    ...leadDto.source,
                    name: "webhook" as const,
                    url: leadDto.source.url || "https://www.google.com",
                },
                meta: {
                    ...meta,
                    location: {
                        ...meta.location,
                        address: leadData.address,
                        country: leadData.country,
                        city: leadData.city,
                    },
                },
            };

            const context = {
                accountId: String(accountId),
                organizationId: String(req?.webhook?.organizationId),
                userId: String(req?.webhook?.organizationId),
                userName: String(req?.user?.name||""),
            };

            const result = await this.leadService.createLead(
                context,
                leadDataPayload,
            );
            httpResponse(req, res, 200, "Lead create successfully", result);
        } catch (error) {
            next(error);
        }
    };


}