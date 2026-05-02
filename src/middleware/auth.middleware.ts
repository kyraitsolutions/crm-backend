import { Request, Response, NextFunction } from "express";
import passport from "passport";
import { ENV } from "../constants/index.js";
import { OrganizationMember } from "../models/organizationMember.model.js";
import { TUser } from "../types/user.type.js";

export class AuthMiddleware {
  static authenticate(req: Request, res: Response, next: NextFunction): void {
    passport.authenticate(
      "jwt",
      { session: false },
      async (err: any, user: TUser, _info: any) => {
        console.log("user to hai", user);
        console.log(err);
        if (err) {
          return next(err);
        }
        if (!user) {
          console.log("req",req)
          return res.status(401).json({ message: "Unauthorized" });
        }

        console.log("user to hai", user);

        const organizationMember = (
          await OrganizationMember.findOne({
            userId: user.id,
          }).populate("roleId", "name level")
        )?.toJSON();

        req.user = {
          ...user,
          id: user.id as string,
          organizationId: organizationMember?.organizationId,
          role: organizationMember?.roleId as {
            name: string;
            level: number;
            id: string;
          },
        };
        next();
      },
    )(req, res, next);
  }

  static googleAuth() {
    return (req: Request, res: Response, next: NextFunction) => {
      const platform = req.query.platform === "mobile" ? "mobile" : "web";

      console.log("Platfrom in middleware", platform);

      passport.authenticate("google", {
        scope: ["profile", "email"],
        session: false,
        state: platform, // 👈 preserved through OAuth
      })(req, res, next);
    };
    // return passport.authenticate("google", {
    //   scope: ["profile", "email"],
    //   session: false,
    //   state: "mobile",
    // });
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
    _next: NextFunction,
  ): void {
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal server error";

    res.status(statusCode).json({
      error: {
        message,
        ...(ENV.APP.NODE_ENV === "development" && { stack: err.stack }),
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
