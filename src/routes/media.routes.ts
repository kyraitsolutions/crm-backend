// routes/media.routes.ts
import { Router } from "express";
import { MediaController } from "../controllers/media.controller.js";
import { AuthMiddleware } from "../middleware/auth.middleware.js";

export class MediaRouter {
  public router: Router;
  private controller: MediaController;

  constructor() {
    this.router = Router();
    this.controller = new MediaController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Generate pre-signed upload URL
    this.router.post(
      "/upload/presigned-url",
      AuthMiddleware.authenticate,
      this.controller.createMediaUploadUrl.bind(this.controller),
    );

    // // Get signed download URL (view file)
    // this.router.get(
    //   "/view",
    //   AuthMiddleware.authenticate,
    //   this.controller.getFile.bind(this.controller),
    // );

    // // Delete media
    // this.router.delete(
    //   "/",
    //   AuthMiddleware.authenticate,
    //   this.controller.deleteFile.bind(this.controller),
    // );
  }

  public getRouter(): Router {
    return this.router;
  }
}
