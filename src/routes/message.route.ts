import { Router } from "express";
import { MessageController } from "../controllers/messages.controller";

export class MessageRouter {
  private router: Router;
  private controller: MessageController;

  constructor() {
    this.router = Router();
    this.controller = new MessageController();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // SEND MESSAGE
    this.router.post(
      "/save",
      this.controller.saveMessage.bind(this.controller),
    );
  }

  public getRouter() {
    return this.router;
  }
}
