import express, { Application } from "express";
import passport from "./config/passport.js";
import { ErrorMiddleware } from "./middleware/auth.middleware.js";
import cors from "cors";
import { AppRoutes } from "./routes/index.js";
import { initDB } from "./db/index.js";
import { createWebSocketServer } from "./config/wsServer/wsServer.js";
import http from "http";
import { configureNumber } from "./modules/salesAgent/config/twilio.js";
// import { seedPermissions } from "./scripts/seed/seedPermissions.js";
// import { config } from "./config/index.js";

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
    this.app.use(
      cors({
        // origin: config.cross_domains?.origin || "*",
        origin: "*",
        credentials: true,
      }),
    );
    this.app.use(express.json({limit:"10mb"}));
    this.app.use(express.urlencoded({ extended: true,limit:"10mb" }));
    this.app.use(passport.initialize());
  }

  private initializeRoutes(): void {
    this.app.use("/api", this.appRoutes.getRouter());
  }

  private initializeErrorHandling(): void {
    this.app.use(ErrorMiddleware.notFound);
    this.app.use(ErrorMiddleware.handle);
  }

  public async listen(port: number): Promise<void> {
    const server = http.createServer(this.app);
    createWebSocketServer(server);
    configureNumber()
    // await seedPermissions();
    server.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  }
}
