import { Router } from "express";
import { IntegrationRouter } from "./integration.routes.js";
import { WhatsAppIntegrationRouter } from "./integration.whatsapp.route.js";

// import { FacebookIntegrationRouter } from "./integration.facebook.routes.js";
// import { GoogleIntegrationRouter } from "./integration.google.routes.js";

export class IntegrationsRouter {
  public router: Router;

  private integrationRouter: IntegrationRouter;
  private whatsappIntegrationRouter: WhatsAppIntegrationRouter;

  constructor() {
    this.router = Router();

    this.integrationRouter = new IntegrationRouter();
    this.whatsappIntegrationRouter = new WhatsAppIntegrationRouter();
    // this.facebookIntegrationRouter = new FacebookIntegrationRouter();
    // this.googleIntegrationRouter = new GoogleIntegrationRouter();

    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Generic Integration Routes
    this.router.use("/", this.integrationRouter.getRouter());

    // WhatsApp Integration Routes
    this.router.use("/whatsapp", this.whatsappIntegrationRouter.getRouter());
  }

  public getRouter(): Router {
    return this.router;
  }
}
