import { Router } from "express";
import { AuthMiddleware } from "../../../middleware/auth.middleware.js";
import { TwilioController } from "../controllers/twilio.controller.js";

export class TwilioRouter {
    public router: Router;
    private twilioController=new TwilioController();
    // private webhookController = new WebhookController();

    constructor() {
        this.router = Router();
        this.initializeRoutes();
    }


    private initializeRoutes() {
        this.router.post(
            "/voice/incoming",
            // AuthMiddleware.authenticate,
            //   requirePermission("settings.update"),
            this.twilioController.incomingCall.bind(this.twilioController)
        );
        this.router.post(
            "/voice/gather",
            // AuthMiddleware.authenticate,
            //   requirePermission("settings.update"),
            this.twilioController.gatherCallInformation.bind(this.twilioController)
        );
        this.router.post(
            "/voice/status",
            // AuthMiddleware.authenticate,
            //   requirePermission("settings.update"),
            this.twilioController.callStatus.bind(this.twilioController)
        );
        this.router.post(
            "/voice/make-call",
            // AuthMiddleware.authenticate,
            //   requirePermission("settings.update"),
            this.twilioController.makeCall.bind(this.twilioController)
        );
        this.router.get(
            "/voice/calls",
            AuthMiddleware.authenticate,
            //   requirePermission("settings.update"),
            this.twilioController.getCalls.bind(this.twilioController)
        );
        this.router.get(
            "/voice/get-available-numbers",
            AuthMiddleware.authenticate,
            //   requirePermission("settings.update"),
            this.twilioController.getAvailableNumbers.bind(this.twilioController)
        );
        
        this.router.post(
            "/voice/purchase-number",
            AuthMiddleware.authenticate,
            //   requirePermission("settings.update"),
            this.twilioController.purchaseNumber.bind(this.twilioController)
        );
        this.router.post(
            "/voice/my-numbers",
            AuthMiddleware.authenticate,
            //   requirePermission("settings.update"),
            this.twilioController.getMyNumbers.bind(this.twilioController)
        );
        this.router.post(
            "/voice/my-number/details",
            AuthMiddleware.authenticate,
            //   requirePermission("settings.update"),
            this.twilioController.getNumberDetails.bind(this.twilioController)
        );
        this.router.post(
            "/voice/release-number",
            AuthMiddleware.authenticate,
            //   requirePermission("settings.update"),
            this.twilioController.purchaseNumber.bind(this.twilioController)
        );
    }
    public getRouter(): Router {
        return this.router;
    }
}