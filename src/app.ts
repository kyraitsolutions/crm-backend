import express, { Application } from "express";
import passport from "./config/passport";
import { ErrorMiddleware } from "./middleware/auth.middleware";
import cors from "cors";
import { appRouter } from "./routes";

export class App {
  public app: Application;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    this.app.use(
      cors({
        origin: "http://localhost:5173",
        credentials: true,
      })
    );
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(passport.initialize());
  }

  private initializeRoutes(): void {
    this.app.use("/api", appRouter);

    this.app.get("/", (_req, res) => {
      res.json({
        message: "Chat API",
        endpoints: {
          register: "POST /api/auth/register",
          login: "POST /api/auth/login",
          googleAuth: "GET /api/auth/google",
          profile: "GET /api/profile (requires JWT)",
          updateProfile: "PUT /api/profile (requires JWT)",
          deleteProfile: "DELETE /api/profile (requires JWT)",
        },
      });
    });
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
