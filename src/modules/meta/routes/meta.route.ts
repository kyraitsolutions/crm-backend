import { Router } from "express";
import { MetaWebhookRouter } from "./meta-webhook.route.js";

export class MetaRouter {
  public router: Router;
  private metaWebhookRouter = new MetaWebhookRouter();

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.use("/webhook", this.metaWebhookRouter.getRouter());
  }

  public getRouter(): Router {
    return this.router;
  }
}
