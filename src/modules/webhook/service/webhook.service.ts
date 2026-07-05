import { createHash, randomBytes } from "crypto";
import { WebhookRepository } from "../repository/webhook.repository.js";



export class WebhookService {
    constructor(
        private webhookRepo = new WebhookRepository()
    ) { }

    async createToken({ accountId, organizationId, createdBy }: { accountId: string, organizationId: string, createdBy: string }) {
        // Check if token already exists
        // const existing = await this.webhookRepo.findOne({ accountId, organizationId });
        // console.log(existing)

        // if (existing) {
        //     return { response: existing, msg: "Token exist already" };// Only returned once    
        // }
        // Generate token
        const token = `webhook_${randomBytes(32).toString("hex")}`;

        const tokenHash = createHash("sha256").update(token).digest("hex");

        const payload = {
            accountId,
            name: "My Webhook Token",
            organizationId: organizationId,
            tokenHash,
            tokenPrefix: token.substring(0, 18),
            createdBy: createdBy,
        }
        // const savedToken=await this.webhookRepo.create(payload)
        const savedToken = await this.webhookRepo.findOneAndUpdate(
            { accountId, organizationId },
            payload,
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true,
            }
        );
        const data = {savedToken, token }
        return { response: data, msg: "New token generated successfully" };
    }


    async getToken({ accountId, organizationId }: { accountId: string, organizationId: string }) {
        return await this.webhookRepo.findOne({ accountId, organizationId });
    }
}