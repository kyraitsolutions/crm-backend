import { Request, Response, NextFunction } from "express";
import passport from "passport";
import { ENV } from "../constants";

export class AuthMiddleware {
  static authenticate(req: Request, res: Response, next: NextFunction): void {
    passport.authenticate(
      "jwt",
      { session: false },
      (err: any, user: any, _info: any) => {
        if (err) {
          return next(err);
        }
        if (!user) {
          return res.status(401).json({ message: "Unauthorized" });
        }
        req.user = user;
        next();
      }
    )(req, res, next);
  }

  static googleAuth() {
    return passport.authenticate("google", {
      scope: ["profile", "email"],
      session: false,
    });
  }

  static googleCallback() {
    return passport.authenticate("google", {
      session: false,
      failureRedirect: "/auth/google/failure",
    });
  }

  static localLogin() {
    return passport.authenticate("local-login", { session: false });
  }
}

export class ErrorMiddleware {
  static handle(
    err: any,
    _req: Request,
    res: Response,
    _next: NextFunction
  ): void {
    console.error("Error:", err);

    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal server error";

    res.status(statusCode).json({
      error: {
        message,
        ...(ENV.NODE_ENV === "development" && { stack: err.stack }),
      },
    });
  }

  static notFound(_req: Request, res: Response, _next: NextFunction): void {
    res.status(404).json({
      error: {
        message: "Route not found",
      },
    });
  }
}
