import { Router } from "express";
import { WhatsappAccountController } from "../account/controllers/whatsapp.controller.js";

export class WhatsappAccountRouter {
  public router = Router();
  private whatsappAccountController = new WhatsappAccountController();

  constructor() {
    this.router = Router({
      mergeParams: true,
    });
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(
      "/register-phone-number",
      this.whatsappAccountController.registerPhoneNumber.bind(
        this.whatsappAccountController,
      ),
    );

    this.router.post(
      "/sync-contacts",
      this.whatsappAccountController.syncContacts.bind(
        this.whatsappAccountController,
      ),
    );
  }

  getRouter() {
    return this.router;
  }
}
