import express, { Application, NextFunction, Request, Response } from "express";
import passport from "./config/passport.js";
import { ErrorMiddleware } from "./middleware/auth.middleware.js";
import cors from "cors";
import { AppRoutes } from "./routes/index.js";
import { initDB } from "./db/index.js";
import { createWebSocketServer } from "./config/wsServer/wsServer.js";
import http from "http";
import logger from "./utils/logger.js";

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
        origin: "*",
        credentials: true,
      }),
    );
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));
    this.app.use(passport.initialize());
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const startedAt = Date.now();
      res.on("finish", () => {
        logger.http(
          `${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - startedAt}ms`,
        );
      });
      next();
    });
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
    // await import("./workers/index.js");
    // configureNumber()
    // await seedPermissions();
    server.listen(port, () => {
      logger.info(`Server is running on port ${port}`);
    });
  }
}
