import { Router } from "express";
import { MessageController } from "../messages/controllers/message.controller.js";
import { upload } from "../../../config/multer.config.js";

export class WhatsAppMessageRouter {
  public router: Router;

  private controller = new MessageController();

  constructor() {
    this.router = Router({
      mergeParams: true,
    });
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(
      "/send",
      upload.single("file"),
      this.controller.sendMessage.bind(this.controller),
    );

    this.router.get(
      "/media/:mediaId",
      this.controller.getMedia.bind(this.controller),
    );
  }

  public getRouter() {
    return this.router;
  }
}
