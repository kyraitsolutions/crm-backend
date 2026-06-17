import { Router } from "express";
import { AuthMiddleware } from "../middleware/auth.middleware.js";
import { ContactController } from "../controllers/contact.controller.js";

export class ContactRouter {
  public router: Router;
  private contactController: ContactController;
  constructor() {
    this.router = Router();
    this.contactController = new ContactController();
    this.initializeRoutes();
  }
  private initializeRoutes(): void {

    this.router.post(
      "/",
      AuthMiddleware.authenticate,
      this.contactController.getContacts.bind(
        this.contactController,
      ),
    );
    this.router.post(
      "/create",
      AuthMiddleware.authenticate,
      this.contactController.createContact.bind(
        this.contactController,
      ),
    );
  }
  public getRouter(): Router {
    return this.router;
  }
}
