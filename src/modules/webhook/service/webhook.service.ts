import { createHash, randomBytes } from "crypto";
import { WebhookRepository } from "../repository/webhook.repository.js";
import { SubscriptionService } from "../../../services/subscription.service.js";
import { USAGE_METRIC } from "../../../constants/subscription.constant.js";

export class WebhookService {
    constructor(
        private webhookRepo = new WebhookRepository()
    ) { }
    async createToken({ accountId, organizationId, createdBy }: { accountId: string, organizationId: string, createdBy: string }) {
        const existing = await this.webhookRepo.findOne({ accountId, organizationId });
        if (!existing) {
            await new SubscriptionService().checkLimit(
                organizationId,
                USAGE_METRIC.WEBHOOKS,
            );
        }

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
