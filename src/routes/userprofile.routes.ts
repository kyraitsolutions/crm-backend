import { Router } from "express";
import { UserController } from "../controllers/user.controller.js";
import { AuthMiddleware } from "../middleware/index.js";

export class UserProfileRouter {
  public router: Router;
  private userController: UserController;

  constructor() {
    this.router = Router();
    this.userController = new UserController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.get(
      "/",
      AuthMiddleware.authenticate,
      this.userController.getMe.bind(this.userController),
    );
    this.router.post(
      "/update",
      AuthMiddleware.authenticate,
      this.userController.updateProfile.bind(this.userController),
    )
  }

  public getRouter(): Router {
    return this.router;
  }
}
