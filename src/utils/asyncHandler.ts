import { NextFunction, Request, Response } from "express";
import { logError } from "./logger.js";

type AsyncRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;

export const asyncHandler = (
  scope: string,
  handler: AsyncRouteHandler,
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(handler(req, res, next)).catch((error: unknown) => {
      handleRouteError(scope, error, next, req);
    });
  };
};

export const handleRouteError = (
  scope: string,
  error: unknown,
  next: NextFunction,
  req?: Request,
): void => {
  logError(scope, error, {
    method: req?.method,
    path: req?.originalUrl,
  });
  next(error);
};
