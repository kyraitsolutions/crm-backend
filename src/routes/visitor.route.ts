// routes/visitor.route.ts

import { Router } from "express";
import { VisitorController } from "../controllers/visitor.controller.js";

export class VisitorRouter {
  public router: Router;
  private visitorController: VisitorController;
  constructor() {
    this.router = Router();

    this.visitorController = new VisitorController();

    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.post(
      "/init",
      this.visitorController.initializeVisitor.bind(this.visitorController),
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}
