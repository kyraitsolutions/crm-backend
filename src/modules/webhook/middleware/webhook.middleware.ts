import { createHash } from "crypto";
import { NextFunction, Request, Response } from "express";
import { WebhookTokenModel } from "../../../models/webhookToken.model.js";

export class WebhookMiddleware {
    static async authenticate(req: Request, res: Response, next: NextFunction): Promise<any> {
        const auth = req.headers.authorization;

        if (!auth?.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Webhook token missing",
            });
        }

        const token = auth.replace("Bearer ", "");
        const hash = createHash("sha256").update(token).digest("hex");


        const webhook = await WebhookTokenModel.findOne({
            tokenHash: hash,
            isActive: true,
        });

        console.log("jkhjg",hash,token,webhook)


        if (!webhook) {
            return res.status(401).json({
                message: "Invalid webhook token",
            });
        }

        req.webhook = {
            accountId: webhook.accountId,
            organizationId: webhook.organizationId,
            // permissions: webhook.permissions,
            webhookId: webhook._id,
        };

        await WebhookTokenModel.updateOne(
            { _id: webhook._id },
            {
                $set: {
                    lastUsedAt: new Date(),
                },
            }
        );
        next();
    }
}