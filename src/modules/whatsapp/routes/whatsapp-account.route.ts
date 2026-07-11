import { Router } from "express";
import { WhatsappAccountController } from "../account/controllers/whatsapp.controller.js";

export class WaAccountRouter {
  public router = Router();
  private whatsappAccountController = new WhatsappAccountController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(
        "/register-phone-number",
        this.whatsappAccountController.registerPhoneNumber.bind(this.whatsappAccountController)
    );

    // this.router.delete(
    //   "/:id",
    //   this.controller.deleteAccount.bind(this.controller)
    // );
  }

  getRouter() {
    return this.router;
  }
}