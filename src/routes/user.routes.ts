import { Router } from "express";
import { UserController } from "../controllers/user.controller.js";
import { AuthMiddleware } from "../middleware/index.js";

export class UserRouter {
  public router: Router;
  private userController: UserController;

  constructor() {
    this.router = Router();
    this.userController = new UserController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.post(
      "/register",
      this.userController.register.bind(this.userController),
    );

    this.router.post(
      "/login",
      this.userController.login.bind(this.userController),
    );

    this.router.get("/google", AuthMiddleware.googleAuth());

    this.router.get(
      "/google/callback",
      AuthMiddleware.googleCallback(),
      this.userController.googleCallback.bind(this.userController),
    );

    this.router.get(
      "/me",
      AuthMiddleware.authenticate,
      this.userController.getMe.bind(this.userController),
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}
