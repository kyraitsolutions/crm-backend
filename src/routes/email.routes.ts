import { Router } from "express";
import { EmailController } from "../controllers/email.controller.js";
import { AuthMiddleware } from "../middleware/auth.middleware.js";

export class EmailRouter {
  public router: Router;
  private emailController: EmailController;

  constructor() {
    this.router = Router();
    this.emailController = new EmailController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.post("/verify",
      AuthMiddleware.authenticate,
      this.emailController.verifyEmail.bind(this.emailController)
    );
    // 🚀 Start Email Campaign
    this.router.post(
      "/:accountId/campaigns/start",
      AuthMiddleware.authenticate,
      this.emailController.startEmailCampaign.bind(this.emailController)
    );


    // Template Routes
    this.router.post(
      "/:accountId/template",
      AuthMiddleware.authenticate,
      this.emailController.createTemplate.bind(this.emailController)
    );
    // this.router.post(
    //   "/:accountId/templates",
    //   AuthMiddleware.authenticate,
    //   this.emailController.createTemplate.bind(this.emailController)
    // );
  }

  public getRouter(): Router {
    return this.router;
  }
}
