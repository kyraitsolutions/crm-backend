import { Request, Response, NextFunction } from "express";
import passport from "passport";
import { OrganizationMember } from "../models/organizationMember.model.js";
import { TUser } from "../types/user.type.js";
import { UserProfileModel } from "../models/userProfile.model.js";
import mongoose from "mongoose";
import { MongoServerError } from "mongodb";
import { TRole } from "../types/roles-permissions.type.js";

export class AuthMiddleware {
  static authenticate(req: Request, res: Response, next: NextFunction): void {
    passport.authenticate(
      "jwt",
      { session: false },
      async (err: any, user: TUser, _info: any) => {
        if (err) {
          return next(err);
        }
        if (!user) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const organizationMember = (
          await OrganizationMember.findOne({
            userId: user.id,
          }).populate("roleId", "name level")
        )?.toJSON();

        const userProfile = await UserProfileModel.findOne({
          userId: user.id,
        }).populate("userId", "email");

        req.user = {
          id: user.id as string,
          ...(userProfile?.firstName
            ? {
                name: `${userProfile.firstName} ${userProfile.lastName || ""}`.trim(),
              }
            : {}),

          // email: userProfile?.userId?.email,
          ...(organizationMember && {
            organizationId: organizationMember?.organizationId,
          }),
          ...(organizationMember && {
            role: organizationMember?.roleId as TRole,
          }),
        };
        next();
      },
    )(req, res, next);
  }

  static googleAuth() {
    return (req: Request, res: Response, next: NextFunction) => {
      const platform = req.query.platform === "mobile" ? "mobile" : "web";

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
    let statusCode = 500;
    let message = err?.message || "Internal server error";
    let errors: any[] = [];

    // Custom Error
    if (err.statusCode) {
      statusCode = err.statusCode;
      message = err.message;
    }

    // Mongoose Validation Error
    else if (err instanceof mongoose.Error.ValidationError) {
      statusCode = 400;
      message = "Validation failed";

      errors = Object.values(err.errors).map((e: any) => {
        if (e.name === "CastError") {
          return {
            field: e.path,
            value: e.value,
            message: `${e.path} must be a valid ID`,
          };
        }

        return {
          field: e.path,
          message: e.message,
          value: e.value,
        };
      });
    }

    // Invalid ObjectId
    else if (err instanceof mongoose.Error.CastError) {
      if (err.path === "_id") {
        message = "Validation failed";
        errors.push({
          field: err.path,
          value: err.value,
          message: `${err.path} must be a valid ID`,
        });
      } else {
        message = `Invalid ${err.path}`;
        errors.push({
          field: err.path,
          value: err.value,
          message: `Invalid ${err.path}`,
        });
      }
    }

    // Duplicate Key Error
    else if (err instanceof MongoServerError && err.code === 11000) {
      statusCode = 409;

      const field = Object.keys(err.keyValue)[0];

      message = `${field} already exists`;

      errors.push({
        field,
        message,
      });
    }

    // JWT Invalid
    else if (err.name === "JsonWebTokenError") {
      statusCode = 401;
      message = "Invalid token";
    }

    // JWT Expired
    else if (err.name === "TokenExpiredError") {
      statusCode = 401;
      message = "Token expired";
    }

    // Meta API Error
    else if (err.response?.data?.error) {
      statusCode = err.response.status || 400;
      message = err.response.data.error.message;
    }

    res.status(statusCode).json({
      success: false,
      message,
      ...(errors.length && { errors }),
      // ...(process.env.NODE_ENV === "development" && {
      //   stack: err.stack,
      // }),
    });
  }
  // static handle(
  //   err: any,
  //   _req: Request,
  //   res: Response,
  //   _next: NextFunction,
  // ): void {
  //   const statusCode = err.statusCode || 500;
  //   const message = err.message || "Internal server error";

  //   console.error(err.st);

  //   res.status(statusCode).json({
  //     error: {
  //       message,
  //       ...(ENV.APP.NODE_ENV === "development" && { stack: err.stack }),
  //     },
  //   });
  // }

  static notFound(_req: Request, res: Response, _next: NextFunction): void {
    res.status(404).json({
      error: {
        message: "Route not found",
      },
    });
  }
}
