import { Router } from "express";
import { WebhookController } from "../controller/webhook.controller.js";
import { AuthMiddleware } from "../../../middleware/auth.middleware.js";
import { WebhookMiddleware } from "../middleware/webhook.middleware.js";

export class WebhookRouter {
    public router: Router;
    private webhookController = new WebhookController();

    constructor() {
        this.router = Router();
        this.initializeRoutes();
    }


    private initializeRoutes() {
        this.router.post(
            "/:accountId/token",
            AuthMiddleware.authenticate,
            //   requirePermission("settings.update"),
            this.webhookController.generateToken.bind(this.webhookController)
        );
        this.router.get(
            "/:accountId/token",
            AuthMiddleware.authenticate,
            //   requirePermission("settings.update"),
            this.webhookController.getToken.bind(this.webhookController)
        );

        this.router.post(
            "/:accountId/lead",
            WebhookMiddleware.authenticate,
            // requirePermission("leads.create"),
            this.webhookController.createWebhookLead.bind(this.webhookController),
        );

    }
    public getRouter(): Router {
        return this.router;
    }
}