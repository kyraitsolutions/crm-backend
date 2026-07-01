import { WebhookTokenModel } from "../../../models/webhookToken.model.js";
import { Types } from 'mongoose';


export class WebhookRepository {
    async findOneAndUpdate(filter: any, update: any, options: any) {
        return WebhookTokenModel.findOneAndUpdate(
            filter,
            {
                $set: update,
            },
            options
        );
    }

    async findOne({ accountId, organizationId }: { accountId: string, organizationId: string }) {
        console.log(accountId, organizationId)
        return await WebhookTokenModel.findOne({ accountId: new Types.ObjectId(accountId), organizationId: new Types.ObjectId(organizationId) });
    }
}