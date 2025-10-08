import express, { Application } from "express";
import passport from "./config/passport";
import { ErrorMiddleware } from "./middleware/auth.middleware";
import cors from "cors";
import { AppRoutes } from "./routes";
import { initDB } from "./db";

export class App {
  public app: Application;
  private appRoutes: AppRoutes;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.appRoutes = new AppRoutes();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeDB();
  }

  private async initializeDB() {
    await initDB();
  }

  private initializeMiddlewares(): void {
    this.app.use(cors({ origin: "http://localhost:5173", credentials: true }));
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(passport.initialize());
  }

  private initializeRoutes(): void {
    this.app.use("/api", this.appRoutes.getRouter());
  }

  private initializeErrorHandling(): void {
    this.app.use(ErrorMiddleware.notFound);
    this.app.use(ErrorMiddleware.handle);
  }

  public listen(port: number): void {
    this.app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  }
}
