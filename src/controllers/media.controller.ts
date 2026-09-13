// controllers/media.controller.ts
import { NextFunction, Request, Response } from "express";
import { handleRouteError } from "../utils/asyncHandler.js";
import { mediaService } from "../container.js";
import httpResponse from "../utils/http.response.js";

export class MediaController {
  createMediaUploadUrl = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = req.user;
      const dtoPayload = {
        userId: user?.id,
        ...req.body,
      };
      const data = await mediaService.createMediaUploadUrl(dtoPayload);
      httpResponse(req, res, 200, "Presigned url generated successfully", {
        doc: data,
      });
    } catch (error) {
      handleRouteError("MediaController", error, next, req);
    }
  };
}
