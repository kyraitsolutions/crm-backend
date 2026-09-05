import { Request, Response, NextFunction } from "express";
import passport from "passport";
import { OrganizationMember } from "../models/organizationMember.model.js";
import { TUser } from "../types/user.type.js";
import { UserProfileModel } from "../models/userProfile.model.js";
import mongoose from "mongoose";
import { MongoServerError } from "mongodb";
import { TRole } from "../types/roles-permissions.type.js";
import { UserModel } from "../models/user.model.js";
import logger from "../utils/logger.js";
import { buildRequestMeta } from "../utils/http.response.js";
import { HttpError } from "../utils/http.error.js";

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
          return res.status(401).json({
            success: false,
            responseStatusCode: 401,
            responseMessage: "Unauthorized",
            message: "Unauthorized",
          });
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

        await UserModel.updateOne(
          { _id: user.id },
          {
            $set: {
              lastUsedAt: new Date(),
            },
          }
        );
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
    req: Request,
    res: Response,
    _next: NextFunction,
  ): void {
    let statusCode = 500;
    let message = err?.message || "Internal server error";
    let errors: any[] = [];

    if (err instanceof HttpError || err.statusCode) {
      statusCode = err.statusCode;
      message = err.message;
      if (err.details) {
        errors = Array.isArray(err.details) ? err.details : [err.details];
      }
    } else if (err instanceof mongoose.Error.ValidationError) {
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
    } else if (err instanceof mongoose.Error.CastError) {
      statusCode = 400;
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
    } else if (err instanceof MongoServerError && err.code === 11000) {
      statusCode = 409;

      const field = Object.keys(err.keyValue)[0];

      message = `${field} already exists`;

      errors.push({
        field,
        message,
      });
    } else if (err.name === "JsonWebTokenError") {
      statusCode = 401;
      message = "Invalid token";
    } else if (err.name === "TokenExpiredError") {
      statusCode = 401;
      message = "Token expired";
    } else if (err.response?.data?.error) {
      statusCode = err.response.status || 400;
      message =
        err.response.data.error.error_data?.details ||
        err.response.data.error.message;
    }

    logger.error("Unhandled request error", {
      message,
      statusCode,
      method: req.method,
      path: req.originalUrl,
      stack: err?.stack,
    });

    res.status(statusCode).json({
      success: false,
      responseStatusCode: statusCode,
      responseMessage: message,
      message,
      request: buildRequestMeta(req),
      ...(errors.length && { errors }),
    });
  }

  static notFound(req: Request, res: Response, _next: NextFunction): void {
    res.status(404).json({
      success: false,
      responseStatusCode: 404,
      responseMessage: "Route not found",
      message: "Route not found",
      request: buildRequestMeta(req),
    });
  }
}
