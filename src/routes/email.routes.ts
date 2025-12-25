import { Router } from "express";
import { EmailController } from "../controllers/email.controller.js";

export class EmailRouter {
  public router: Router;
  private emailController: EmailController;

  constructor() {
    this.router = Router();
    this.emailController = new EmailController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.get("/verify", this.emailController.verifyEmail);
  }

  public getRouter(): Router {
    return this.router;
  }
}
